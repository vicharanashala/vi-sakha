import base64
import io
from PIL import Image
from src.config.settings import CAPTION_MODEL

_caption_model = None
_caption_processor = None

def get_caption_model():
    global _caption_model, _caption_processor
    if _caption_model is None:
        from transformers import BlipProcessor, BlipForConditionalGeneration
        _caption_processor = BlipProcessor.from_pretrained(CAPTION_MODEL)
        _caption_model = BlipForConditionalGeneration.from_pretrained(CAPTION_MODEL)
    return _caption_model, _caption_processor

def generate_caption(image_base64: str):
    model, processor = get_caption_model()
    image_data = base64.b64decode(image_base64)
    raw_image = Image.open(io.BytesIO(image_data)).convert('RGB')
    inputs = processor(raw_image, return_tensors="pt")
    out = model.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)
    return {"caption": caption}
