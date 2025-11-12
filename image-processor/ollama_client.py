import requests
import base64
import time
from pathlib import Path
from typing import Optional, Dict, Any
import os

OLLAMA_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
DEFAULT_MODEL = os.getenv('OLLAMA_MODEL', 'llava:13b')


class OllamaClient:
    """Client for interacting with Ollama vision models"""

    def __init__(self, base_url: str = OLLAMA_URL, model: str = DEFAULT_MODEL):
        self.base_url = base_url
        self.model = model

    def encode_image(self, image_path: Path) -> str:
        """Encode image to base64 string"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def analyze_image(
        self,
        image_path: Path,
        prompt: str,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze an image with Ollama vision model

        Args:
            image_path: Path to image file
            prompt: Analysis prompt/question
            model: Model to use (defaults to self.model)

        Returns:
            Dict containing analysis results and metadata
        """
        start_time = time.time()

        # Encode image
        image_b64 = self.encode_image(image_path)

        # Prepare request
        model_name = model or self.model
        payload = {
            'model': model_name,
            'prompt': prompt,
            'images': [image_b64],
            'stream': False
        }

        try:
            # Call Ollama API
            response = requests.post(
                f'{self.base_url}/api/generate',
                json=payload,
                timeout=120  # 2 minute timeout for vision models
            )
            response.raise_for_status()

            result = response.json()
            processing_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'model': model_name,
                'response': result.get('response', ''),
                'processing_time_ms': processing_time,
                'raw_result': result
            }

        except requests.exceptions.RequestException as e:
            processing_time = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'model': model_name,
                'error': str(e),
                'processing_time_ms': processing_time
            }

    def describe_image(self, image_path: Path, model: Optional[str] = None) -> Dict[str, Any]:
        """Generate detailed description of street view image"""
        prompt = """Describe this street view image in detail. Include:
- The type of location (urban, suburban, rural)
- Main buildings or structures visible
- Street characteristics (width, surface, markings)
- Visible signage or text
- Notable objects or features
- Weather and lighting conditions
- Overall atmosphere"""
        return self.analyze_image(image_path, prompt, model)

    def detect_objects(self, image_path: Path, model: Optional[str] = None) -> Dict[str, Any]:
        """List all visible objects in the image"""
        prompt = """List all distinct objects and elements visible in this street view image.
Categorize them as: buildings, vehicles, street furniture, signs, vegetation, infrastructure.
For each category, provide specific items you can identify."""
        return self.analyze_image(image_path, prompt, model)

    def extract_text(self, image_path: Path, model: Optional[str] = None) -> Dict[str, Any]:
        """Extract visible text from signs and labels"""
        prompt = """Extract all visible text from this image. Include:
- Business names and signs
- Street signs and traffic signs
- Building numbers and addresses
- Any other readable text
List each piece of text separately."""
        return self.analyze_image(image_path, prompt, model)

    def custom_analysis(
        self,
        image_path: Path,
        custom_prompt: str,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run custom analysis with user-provided prompt"""
        return self.analyze_image(image_path, custom_prompt, model)

    def check_health(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f'{self.base_url}/api/tags', timeout=5)
            return response.status_code == 200
        except:
            return False

    def list_models(self) -> list:
        """List available models in Ollama"""
        try:
            response = requests.get(f'{self.base_url}/api/tags', timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
            return []
        except:
            return []
