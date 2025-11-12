from sqlalchemy import create_engine, Column, Integer, String, Text, Float, TIMESTAMP, ForeignKey, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://imageprocessor:securepassword123@localhost:5432/streetview_analysis')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Image(Base):
    """Captured street view images"""
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), unique=True, nullable=False, index=True)
    filepath = Column(String(512), nullable=False)
    address = Column(Text)
    coordinates = Column(JSONB)  # {lat, lng}
    google_maps_url = Column(Text)
    captured_at = Column(TIMESTAMP(timezone=True))
    width = Column(Integer)
    height = Column(Integer)
    file_size_bytes = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow, index=True)

    # Relationships
    analyses = relationship("AnalysisResult", back_populates="image", cascade="all, delete-orphan")


class AnalysisResult(Base):
    """AI analysis results for images"""
    __tablename__ = 'analysis_results'

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey('images.id', ondelete='CASCADE'), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)  # e.g., 'llava:13b'
    analysis_type = Column(String(50), nullable=False, index=True)  # 'description', 'object_detection', 'ocr'
    result_data = Column(JSONB, nullable=False)  # Flexible JSON storage
    confidence_score = Column(Float)
    processing_time_ms = Column(Integer)
    analyzed_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    # Relationships
    image = relationship("Image", back_populates="analyses")
    detected_objects = relationship("DetectedObject", back_populates="analysis", cascade="all, delete-orphan")
    extracted_texts = relationship("ExtractedText", back_populates="analysis", cascade="all, delete-orphan")


class DetectedObject(Base):
    """Objects detected in images"""
    __tablename__ = 'detected_objects'

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey('analysis_results.id', ondelete='CASCADE'), nullable=False)
    object_class = Column(String(100), nullable=False, index=True)  # 'car', 'building', 'person', 'sign'
    confidence = Column(Float)
    bounding_box = Column(JSONB)  # {x, y, width, height}

    # Relationships
    analysis = relationship("AnalysisResult", back_populates="detected_objects")


class ExtractedText(Base):
    """Text extracted from images via OCR"""
    __tablename__ = 'extracted_text'

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey('analysis_results.id', ondelete='CASCADE'), nullable=False)
    text_content = Column(Text)
    language = Column(String(10))
    bounding_box = Column(JSONB)
    confidence = Column(Float)

    # Relationships
    analysis = relationship("AnalysisResult", back_populates="extracted_texts")


class ProcessingQueue(Base):
    """Queue for async image processing"""
    __tablename__ = 'processing_queue'

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey('images.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), default='pending', index=True)  # 'pending', 'processing', 'completed', 'failed'
    requested_analyses = Column(ARRAY(String))  # ['description', 'object_detection']
    priority = Column(Integer, default=0, index=True)
    error_message = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    started_at = Column(TIMESTAMP(timezone=True))
    completed_at = Column(TIMESTAMP(timezone=True))


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
