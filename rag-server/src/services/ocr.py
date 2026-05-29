import base64

_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['en'])
    return _ocr_reader

def perform_ocr(image_base64: str):
    reader = get_ocr_reader()
    image_data = base64.b64decode(image_base64)
    result = reader.readtext(image_data, detail=0)
    return {"text": " ".join(result), "lines": result}
