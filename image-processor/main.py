from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from datetime import datetime
import os
import json

from database import get_db, init_db, Image, AnalysisResult
from ollama_client import OllamaClient

# Initialize FastAPI app
app = FastAPI(
    title="Street View Image Processor",
    description="AI-powered image analysis service using Ollama vision models",
    version="1.0.0"
)

# Configuration
INPUT_DIR = Path(os.getenv('INPUT_DIR', '/app/input'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', '/app/output'))
OLLAMA_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llava:13b')

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize Ollama client
ollama = OllamaClient(base_url=OLLAMA_URL, model=OLLAMA_MODEL)


# Pydantic models for API
class AnalyzeRequest(BaseModel):
    filename: str = Field(..., description="Image filename to analyze")
    analyses: List[str] = Field(
        default=['description'],
        description="Types of analysis to perform: description, object_detection, ocr, custom"
    )
    model: Optional[str] = Field(None, description="Ollama model to use (default: llava:13b)")
    custom_prompt: Optional[str] = Field(None, description="Custom prompt for analysis")


class BatchAnalyzeRequest(BaseModel):
    filenames: List[str] = Field(..., description="List of image filenames")
    analyses: List[str] = Field(default=['description'])
    model: Optional[str] = None


class AnalysisResponse(BaseModel):
    image_id: int
    filename: str
    model: str
    results: Dict[str, Any]
    processing_time_ms: int


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✓ Database initialized")
    print(f"✓ Input directory: {INPUT_DIR}")
    print(f"✓ Output directory: {OUTPUT_DIR}")
    print(f"✓ Ollama URL: {OLLAMA_URL}")
    print(f"✓ Default model: {OLLAMA_MODEL}")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    ollama_healthy = ollama.check_health()
    return {
        "status": "healthy" if ollama_healthy else "degraded",
        "service": "image-processor",
        "ollama_available": ollama_healthy,
        "timestamp": datetime.utcnow().isoformat()
    }


# List available models
@app.get("/models")
async def list_models():
    """List available Ollama models"""
    models = ollama.list_models()
    vision_models = [m for m in models if 'llava' in m.lower() or 'vision' in m.lower()]
    return {
        "all_models": models,
        "vision_models": vision_models,
        "default_model": OLLAMA_MODEL
    }


# Analyze single image
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Analyze a single image with AI vision model

    Supported analysis types:
    - description: Detailed scene description
    - object_detection: List objects in the image
    - ocr: Extract visible text
    - custom: Use custom_prompt field
    """
    image_path = INPUT_DIR / request.filename

    # Check if image exists
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {request.filename}")

    # Check/create image record in database
    db_image = db.query(Image).filter(Image.filename == request.filename).first()
    if not db_image:
        # Load metadata if JSON file exists
        metadata_path = image_path.with_suffix('.json')
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

        # Create image record
        db_image = Image(
            filename=request.filename,
            filepath=str(image_path),
            address=metadata.get('address'),
            coordinates=metadata.get('coordinates'),
            google_maps_url=metadata.get('url'),
            captured_at=datetime.fromisoformat(metadata['capturedAt'].replace('Z', '+00:00')) if 'capturedAt' in metadata else None,
            width=metadata.get('screenshot', {}).get('width'),
            height=metadata.get('screenshot', {}).get('height'),
            file_size_bytes=image_path.stat().st_size
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)

    # Perform analyses
    results = {}
    total_processing_time = 0
    model_name = request.model or OLLAMA_MODEL

    for analysis_type in request.analyses:
        if analysis_type == 'description':
            result = ollama.describe_image(image_path, model_name)
        elif analysis_type == 'object_detection':
            result = ollama.detect_objects(image_path, model_name)
        elif analysis_type == 'ocr':
            result = ollama.extract_text(image_path, model_name)
        elif analysis_type == 'custom' and request.custom_prompt:
            result = ollama.custom_analysis(image_path, request.custom_prompt, model_name)
        else:
            result = {'success': False, 'error': f'Unknown analysis type: {analysis_type}'}

        if result.get('success'):
            results[analysis_type] = result['response']

            # Save to database
            analysis_record = AnalysisResult(
                image_id=db_image.id,
                model_name=result['model'],
                analysis_type=analysis_type,
                result_data={'response': result['response']},
                processing_time_ms=result['processing_time_ms']
            )
            db.add(analysis_record)
            total_processing_time += result['processing_time_ms']
        else:
            results[analysis_type] = {'error': result.get('error', 'Analysis failed')}

    db.commit()

    return AnalysisResponse(
        image_id=db_image.id,
        filename=request.filename,
        model=model_name,
        results=results,
        processing_time_ms=total_processing_time
    )


# Batch analysis
@app.post("/analyze-batch")
async def analyze_batch(
    request: BatchAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """Analyze multiple images in batch"""
    results = []
    for filename in request.filenames:
        try:
            analyze_req = AnalyzeRequest(
                filename=filename,
                analyses=request.analyses,
                model=request.model
            )
            result = await analyze_image(analyze_req, db=db)
            results.append({"filename": filename, "success": True, "result": result})
        except Exception as e:
            results.append({"filename": filename, "success": False, "error": str(e)})

    return {
        "total": len(request.filenames),
        "successful": sum(1 for r in results if r['success']),
        "failed": sum(1 for r in results if not r['success']),
        "results": results
    }


# Get analysis results for an image
@app.get("/results/{image_id}")
async def get_results(image_id: int, db: Session = Depends(get_db)):
    """Get all analysis results for a specific image"""
    db_image = db.query(Image).filter(Image.id == image_id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")

    analyses = db.query(AnalysisResult).filter(AnalysisResult.image_id == image_id).all()

    return {
        "image": {
            "id": db_image.id,
            "filename": db_image.filename,
            "address": db_image.address,
            "coordinates": db_image.coordinates,
            "captured_at": db_image.captured_at
        },
        "analyses": [
            {
                "id": a.id,
                "type": a.analysis_type,
                "model": a.model_name,
                "result": a.result_data,
                "processing_time_ms": a.processing_time_ms,
                "analyzed_at": a.analyzed_at
            }
            for a in analyses
        ]
    }


# List all images
@app.get("/images")
async def list_images(
    analyzed_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all processed images"""
    query = db.query(Image)

    if analyzed_only:
        query = query.join(AnalysisResult)

    total = query.count()
    images = query.order_by(Image.created_at.desc()).limit(limit).offset(offset).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "images": [
            {
                "id": img.id,
                "filename": img.filename,
                "address": img.address,
                "coordinates": img.coordinates,
                "captured_at": img.captured_at,
                "analysis_count": len(img.analyses)
            }
            for img in images
        ]
    }


# Service information
@app.get("/info")
async def service_info():
    """Get service information and capabilities"""
    return {
        "service": "Street View Image Processor",
        "version": "1.0.0",
        "ollama_url": OLLAMA_URL,
        "default_model": OLLAMA_MODEL,
        "input_directory": str(INPUT_DIR),
        "output_directory": str(OUTPUT_DIR),
        "capabilities": {
            "description": "Detailed scene descriptions",
            "object_detection": "Object and feature identification",
            "ocr": "Text extraction from signs and labels",
            "custom": "Custom prompts for specific analysis needs"
        },
        "endpoints": {
            "/analyze": "POST - Analyze single image",
            "/analyze-batch": "POST - Analyze multiple images",
            "/results/{image_id}": "GET - Retrieve analysis results",
            "/images": "GET - List all images",
            "/models": "GET - List available models",
            "/health": "GET - Health check",
            "/info": "GET - Service information"
        }
    }
