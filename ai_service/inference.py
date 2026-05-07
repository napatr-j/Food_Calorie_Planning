"""
AI inference module — copy of backend/inference.py.
Kept separate so ai_service has no dependency on the old backend package.
"""

import io
import json

import torch
import torch.nn as nn
import torchvision.transforms as T
from PIL import Image
from torchvision.models import efficientnet_b0

_model = None
_class_names = None


class FoodClassifier(nn.Module):
    """EfficientNet-B0 based classifier for Thai food classes."""

    def __init__(self, num_classes: int, dropout_rate: float = 0.3):
        """
        Args:
            num_classes: Number of output classes.
            dropout_rate: Dropout applied in the classifier head.
        """
        super().__init__()
        base = efficientnet_b0(weights=None)
        self.backbone = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(1280, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(dropout_rate / 2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        """Forward pass."""
        x = self.backbone(x)
        x = self.pool(x)
        return self.classifier(x)


_transform = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def load_model():
    """
    Load model weights and class names into module-level globals.

    This is designed to be called once at service startup.
    """
    global _model, _class_names
    with open("models/class_names.json") as f:
        _class_names = json.load(f)
    model = FoodClassifier(num_classes=len(_class_names))
    checkpoint = torch.load("models/best_model.pth", map_location="cpu")
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _model = model


def predict(image_bytes: bytes) -> dict:
    """
    Run a single-image prediction.

    Args:
        image_bytes: Raw image bytes (JPEG/PNG).

    Returns:
        Dict with keys: label, confidence, top5.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _transform(img).unsqueeze(0)
    with torch.no_grad():
        logits = _model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
    top5_probs, top5_idx = torch.topk(probs, 5)
    return {
        "label": _class_names[top5_idx[0].item()],
        "confidence": top5_probs[0].item(),
        "top5": [
            {"label": _class_names[i.item()], "confidence": p.item()}
            for i, p in zip(top5_idx, top5_probs)
        ],
    }
