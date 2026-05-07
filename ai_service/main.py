"""
AI Inference Microservice — responsible ONLY for PyTorch inference.
All auth, DB, and business logic lives in the Next.js layer.

Run from project root:
    uvicorn ai_service.main:app --reload --port 8000
"""

import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_service.inference import load_model, predict

app = FastAPI(title="FoodCalorie AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NEXTJS_URL", "http://localhost:3000")],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png"}


@app.on_event("startup")
def startup():
    """Load the ML model into memory once when the service starts."""
    load_model()


@app.get("/health")
def health():
    """Health check endpoint for uptime monitoring."""
    return {"status": "ok", "service": "ai-inference"}


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    """
    Classify an uploaded food image.

    Args:
        file: Uploaded image file (.jpg/.jpeg/.png).

    Returns:
        A prediction payload containing the top label, confidence, and top-5 list.

    Raises:
        HTTPException: If the uploaded file extension is not supported.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only .jpg, .jpeg, .png files are supported")
    image_bytes = await file.read()
    return predict(image_bytes)
