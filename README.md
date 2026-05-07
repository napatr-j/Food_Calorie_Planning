# FoodLens: AI-Powered Food Recognition & Calorie Tracking

> A full-stack deep learning application that classifies food images into **148 categories**, retrieves nutritional data, and tracks daily calorie intake against personalized health goals — with dedicated coverage of Thai cuisine.

---

## Table of Contents

1. [Final Project Topic](#1-final-project-topic)
2. [Why Is This Topic Interesting?](#2-why-is-this-topic-interesting)
3. [Why Does This Topic Require Deep Learning?](#3-why-does-this-topic-require-deep-learning)
4. [Deep Learning Architecture](#4-deep-learning-architecture)
5. [Codebase Explanation](#5-codebase-explanation)
6. [Training Method](#6-training-method)
7. [Model Evaluation](#7-model-evaluation)
8. [Reference Articles and Related Work](#8-reference-articles-and-related-work)
9. [How to Run This Project](#9-how-to-run-this-project)
10. [Project Structure](#10-project-structure)

---

## 1. Final Project Topic

**FoodLens: AI-Powered Food Recognition & Calorie Tracking System**

FoodLens is a production-ready full-stack application that allows users to photograph any dish and instantly receive an AI-generated food classification with ranked confidence scores, complete macro-nutritional data (kcal, protein, fat, carbohydrates, sugar), and a running log of daily caloric intake compared against a personalized TDEE-based daily goal.

The system supports **148 food classes** spanning international dishes sourced from the Food-101 benchmark dataset and Thai cuisine sourced from the FoodyDudy dataset — making it uniquely suited to Southeast Asian users whose dietary habits are largely absent from mainstream nutrition tracking applications.

---

## 2. Why Is This Topic Interesting?

### Motivation

Dietary tracking is one of the most evidence-based strategies for managing weight and reducing the risk of non-communicable diseases such as Type 2 diabetes, obesity, and cardiovascular disease. Despite this, manual food logging is widely abandoned because it requires users to search, identify, and enter nutritional values for every meal — a friction point that automated image classification can eliminate entirely.

### Real-World Usefulness

| Problem | FoodLens Solution |
|---|---|
| Manual food lookup is slow and error-prone | Single photo → instant nutrition facts |
| Mainstream apps have minimal Thai food coverage | 47 Thai-specific classes included |
| TDEE and BMI require complex manual calculation | Mifflin-St Jeor formula computed server-side automatically |
| Users abandon logging due to inconvenience | Drag-and-drop upload with sub-second feedback |
| No visibility into eating patterns over time | 7-day calorie history with per-meal breakdown |

### Why This Topic Was Chosen

Thai cuisine is notoriously absent from mainstream nutrition apps (MyFitnessPal, Cronometer), yet it varies dramatically in caloric density — pad thai (~400 kcal), mango sticky rice (~350 kcal), pork leg stew (~600 kcal), green curry (~200 kcal). Building a classifier that combines the international breadth of Food-101 with the Thai-specific depth of FoodyDudy fills a genuine, practical gap for health-conscious users in Thailand.

---

## 3. Why Does This Topic Require Deep Learning?

### The Problem Is Visual Recognition at Scale

Food classification requires distinguishing between 148 visually similar categories captured under uncontrolled real-world conditions — varying lighting, plating styles, camera angles, portion sizes, and preparation methods. This is a high-dimensional, fine-grained visual recognition task that is fundamentally ill-suited to traditional machine learning approaches.

### Comparison: Deep Learning vs. Traditional Approaches

| Aspect | Traditional ML (SVM, Random Forest, kNN) | Deep Learning (Transfer Learning CNN) |
|---|---|---|
| Feature engineering | Manual — SIFT, HOG, color histograms | Automatic — learned hierarchically end-to-end |
| Performance on 148 classes | Poor — handcrafted features lack discriminative power | High accuracy via learned multi-scale representations |
| Generalization to new conditions | Brittle — sensitive to lighting and angle changes | Robust — data augmentation teaches invariance |
| Scalability with class count | Degrades as class count grows | Scales well when sufficient training data exists |
| Transfer learning | Not directly applicable | Pre-trained ImageNet weights provide a massive head start |
| Fine-grained distinctions | Cannot reliably separate visually similar dishes | Learns subtle texture and color patterns between similar classes |

### Why Traditional Approaches Fall Short

Foods such as `fried_egg` vs. `omelet` vs. `omelette`, or `chicken_curry` vs. `chicken_green_curry` vs. `chicken_panang`, are visually nearly indistinguishable and differ only in subtle texture and color distribution patterns. Handcrafted feature descriptors (SIFT, BoVW, HOG) cannot capture these fine-grained inter-class differences at the scale of 148 classes. A convolutional neural network learns to detect discriminative spatial patterns at multiple scales — precisely the capability this problem demands.

### Strengths of the Deep Learning Approach

- **Transfer learning**: EfficientNet-B0, pre-trained on ImageNet (1.2M images, 1,000 classes), provides a rich feature extractor that dramatically reduces the data requirement for convergence.
- **Data augmentation**: Geometric and photometric transforms allow the model to generalize across dish presentations, lighting conditions, and camera distances.
- **End-to-end optimization**: Backbone and classifier head are jointly fine-tuned, allowing low-level features to specialize for food imagery.
- **Confidence calibration**: Softmax output provides a confidence score used to filter low-quality predictions (threshold: 0.6) before logging.

### Weaknesses and Limitations

- Requires a labeled image dataset per class; adding new food categories requires data collection and retraining.
- Performance degrades on heavily occluded, partially eaten, or mixed-dish plates.
- The confidence threshold (≥ 0.6) may reject valid but photographically challenging images.

---

## 4. Deep Learning Architecture

### 4.1 Model Overview

The classifier is a **custom transfer learning model** built on the **EfficientNet-B0** backbone with a 3-layer fully connected classification head that replaces the original 1,000-class ImageNet head. EfficientNet-B0 was chosen for its compound scaling efficiency: it achieves state-of-the-art accuracy per parameter, making it practical for CPU inference in the production FastAPI microservice.

### 4.2 Model Class Definition

```python
# notebooks/02_training.ipynb — Section 4: Model Architecture
class FoodClassifier(nn.Module):
    def __init__(self, num_classes: int = 148, dropout_rate: float = 0.3):
        super().__init__()
        # EfficientNet-B0 backbone pre-trained on ImageNet-1K
        base = efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
        self.backbone = base.features       # 7 MBConv stages → output: (B, 1280, 7, 7)
        self.pool     = nn.AdaptiveAvgPool2d(1)  # Spatial pooling → (B, 1280, 1, 1)

        # Custom 3-layer classifier head
        self.classifier = nn.Sequential(
            nn.Flatten(),                   # → (B, 1280)
            nn.Linear(1280, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),                      # Swish activation (native to EfficientNet)
            nn.Dropout(0.30),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(256, 148),            # 148-class logits
        )

    def forward(self, x):
        x = self.backbone(x)    # Feature extraction
        x = self.pool(x)        # Global average pooling
        return self.classifier(x)
```

### 4.3 Architecture Diagram

```
 INPUT IMAGE
 (224 × 224 × 3)
       │
       ▼
╔══════════════════════════════════════════════════╗
║           EfficientNet-B0 Backbone               ║
║        (Pre-trained on ImageNet-1K)              ║
║                                                  ║
║  Stem Conv      →  32 channels,  3×3, stride 2  ║
║  MBConv1 ×1     →  16 channels,  3×3, stride 1  ║
║  MBConv6 ×2     →  24 channels,  3×3, stride 2  ║
║  MBConv6 ×2     →  40 channels,  5×5, stride 2  ║
║  MBConv6 ×3     →  80 channels,  3×3, stride 2  ║
║  MBConv6 ×3     → 112 channels,  5×5, stride 1  ║
║  MBConv6 ×4     → 192 channels,  5×5, stride 2  ║
║  MBConv6 ×1     → 320 channels,  3×3, stride 1  ║
║  Head Conv      → 1280 channels, 1×1            ║
║                                                  ║
║  Output: (B, 1280, 7, 7)                         ║
╚══════════════════════════════════════════════════╝
       │
       ▼
  AdaptiveAvgPool2d(1)          →  (B, 1280)
       │
       ▼
╔══════════════════════════════════════════════════╗
║           Custom Classifier Head                 ║
║                                                  ║
║  Flatten                      →  1280            ║
║  Linear(1280 → 512)                              ║
║  BatchNorm1d(512)                                ║
║  SiLU (Swish)                                    ║
║  Dropout(p=0.30)                                 ║
║  Linear(512 → 256)                               ║
║  BatchNorm1d(256)                                ║
║  SiLU (Swish)                                    ║
║  Dropout(p=0.15)                                 ║
║  Linear(256 → 148)            →  raw logits      ║
╚══════════════════════════════════════════════════╝
       │
       ▼
  Softmax  →  Top-5 Confidence Scores
```

**Design choices explained:**

| Component | Choice | Reason |
|---|---|---|
| Backbone | EfficientNet-B0 | Best accuracy/parameter ratio for CPU inference |
| Activation | SiLU (Swish) | Consistent with EfficientNet's native activation; outperforms ReLU on deep networks |
| Normalization | BatchNorm1d after each linear layer | Stabilizes training, reduces need for careful LR tuning |
| Dropout | 0.30 → 0.15 (decreasing) | Stronger regularization in wider layer; relaxed in bottleneck |
| Pooling | AdaptiveAvgPool2d | Spatial-size agnostic; compatible with variable input resolutions |
| Head depth | 3 linear layers | Provides sufficient capacity for 148-class discrimination without overfitting |

### 4.4 Training Pipeline Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       DATA PIPELINE                          │
│                                                              │
│  data/train/  ──►  RandomResizedCrop(224, scale=(0.6,1.0))  │
│               ──►  RandomHorizontalFlip(p=0.5)              │
│               ──►  RandomVerticalFlip(p=0.1)                │
│               ──►  RandomRotation(±20°)                     │
│               ──►  ColorJitter(b=0.4, c=0.4, s=0.3, h=0.1) │
│               ──►  RandomGrayscale(p=0.05)                  │
│               ──►  ToTensor                                  │
│               ──►  RandomErasing(p=0.1)                     │
│               ──►  Normalize(ImageNet μ/σ)                  │
│                                                              │
│  data/valid/  ──►  Resize(256) → CenterCrop(224) → Normalize│
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│             PHASE 1: Head Pre-Warming (Epochs 1–10)          │
│                                                              │
│  Backbone weights: FROZEN (no gradients)                     │
│  Classifier head:  TRAINING                                  │
│  Optimizer:  AdamW(lr=1e-3, weight_decay=1e-4)               │
│  Scheduler:  CosineAnnealingLR(T_max=50, eta_min=1e-6)       │
│  Loss:       CrossEntropyLoss(label_smoothing=0.1)           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│             PHASE 2: Full Fine-Tuning (Epoch 11+)            │
│                                                              │
│  Backbone weights: UNFROZEN (differential lr=1e-5)           │
│  Classifier head:  TRAINING (lr=1e-4)                        │
│  Early stopping:   patience=7, min_delta=1e-4                │
│  Checkpoint saved: whenever val_loss improves                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   models/best_model.pth
                   models/class_names.json
                   models/training_history.json
```

### 4.5 Inference Pipeline Diagram

```
User uploads image (JPEG / PNG)
              │
              ▼
  Next.js  /api/upload  ──►  Validate file type
              │
              ▼
  Forward image bytes to FastAPI  /classify
              │
              ▼
┌─────────────────────────────────┐
│      AI Inference Service       │
│      (FastAPI, port 8000)       │
│                                 │
│  PIL.open() → RGB conversion    │
│  Resize(256)                    │
│  CenterCrop(224)                │
│  ToTensor                       │
│  Normalize(ImageNet μ/σ)        │
│  unsqueeze(0)  →  (1,3,224,224) │
│  FoodClassifier.forward()       │
│  Softmax  →  probability vector │
│  argsort[::-1][:5]  →  top-5   │
└─────────────────────────────────┘
              │
              ▼
     confidence ≥ 0.60 ?
        │           │
       YES          NO
        │           └──►  Return rejection response (not logged)
        ▼
  Save image  →  uploads/{userId}/
  Lookup nutrition  →  foods table
  Insert  →  food_log table
  Return: label, confidence, top5,
          nutrition, log_id, remaining_kcal
```

### 4.6 Why EfficientNet-B0?

| Architecture | Parameters | ImageNet Top-1 | CPU Inference Suitability |
|---|---|---|---|
| VGG-16 | 138 M | 71.6% | Poor (high latency) |
| ResNet-50 | 25 M | 76.1% | Moderate |
| MobileNetV2 | 3.4 M | 71.8% | Good |
| **EfficientNet-B0** | **5.3 M** | **77.1%** | **Excellent** |
| EfficientNet-B3 | 12 M | 81.1% | Moderate |

EfficientNet-B0 achieves higher Top-1 accuracy than ResNet-50 with roughly 5× fewer parameters. For a production inference service running without a GPU, this compact footprint translates directly to lower per-request latency and lower memory usage.

---

## 5. Codebase Explanation

### 5.1 Responsibility Map

| Component | Location | Primary Responsibility |
|---|---|---|
| Exploratory Data Analysis | `notebooks/01_eda.ipynb` | Dataset statistics, class balance, nutritional analysis, visualization |
| Model Training | `notebooks/02_training.ipynb` | Model definition, 2-phase training, evaluation, artifact export |
| AI Inference Service | `ai_service/` | FastAPI server — loads checkpoint, runs inference on uploaded images |
| Database Bootstrap | `database/init_db.py` | Schema creation, indexes, nutritional CSV import |
| Database Queries (legacy) | `database/queries.py` | Python-side DB helpers (superseded by Next.js lib/db.ts) |
| Database Client (active) | `nextjs/src/lib/db.ts` | Libsql SQLite client + all query functions used by API routes |
| Authentication | `nextjs/src/lib/auth.ts` | JWT signing/verification, bcrypt password hashing |
| Type Definitions | `nextjs/src/lib/types.ts` | TypeScript interfaces for User, Profile, FoodLog, Food, etc. |
| Utility Functions | `nextjs/src/lib/utils.ts` | TDEE/BMI formulas, display formatting helpers |
| Route Protection | `nextjs/src/middleware.ts` | Intercepts `/upload/*` and `/account/*` — redirects unauthenticated users |
| REST API Routes | `nextjs/src/app/api/` | All Next.js API route handlers |
| Frontend Pages | `nextjs/src/app/` | React pages (upload, library, account, login, register, about) |
| UI Components | `nextjs/src/components/` | Navbar, CalorieBar, RemainingBar, FoodCard |
| ML Artifacts | `models/` | Trained checkpoint, class label list, per-epoch training history |

### 5.2 Data Loading

`notebooks/02_training.ipynb` uses `torchvision.datasets.ImageFolder`, which scans the directory tree and automatically infers class labels from subdirectory names. A hard assertion confirms exactly 148 classes are present to prevent silent mismatches between the dataset and model output dimension.

```python
train_dataset = datasets.ImageFolder('data/train', transform=train_transform)
val_dataset   = datasets.ImageFolder('data/valid', transform=val_transform)
test_dataset  = datasets.ImageFolder('data/test',  transform=val_transform)

assert len(train_dataset.classes) == CONFIG['num_classes']  # 148
```

DataLoaders use `drop_last=True` on the training split to prevent a smaller final batch from destabilizing Batch Normalization statistics.

### 5.3 Data Augmentation

Training transforms are applied on-the-fly each epoch, providing effectively unlimited data variety without pre-generating augmented copies. Validation and test transforms are fully deterministic (Resize 256 → CenterCrop 224 → Normalize) to ensure reproducible evaluation metrics.

### 5.4 Model Creation

`FoodClassifier` instantiates EfficientNet-B0 with ImageNet pre-trained weights, retains the `features` module (the full convolutional body), and replaces `avgpool` + `classifier` with a custom pooling + 3-layer head. The model is constructed fresh or resumed from the saved checkpoint on each training run.

### 5.5 Training Loop

The training loop (`notebooks/02_training.ipynb` — Section 6) handles:

- **Mixed-precision training** via `torch.cuda.amp.GradScaler` (activated automatically when a CUDA GPU is available; skipped on CPU).
- **Two-phase optimization**: backbone frozen for epochs 1–10, then fully unfrozen from epoch 11 with differential learning rates.
- **Early stopping**: validates after each epoch; halts when `val_loss` fails to decrease by `min_delta=1e-4` for 7 consecutive epochs.
- **Checkpoint saving**: saves the full state (model weights, optimizer state, epoch number, training history) whenever `val_loss` improves.

### 5.6 AI Inference Service

`ai_service/main.py` bootstraps a FastAPI application with CORS restricted to the Next.js origin (`localhost:3000`). On startup, `ai_service/inference.py` loads the checkpoint and class names into memory — keeping the model in RAM for fast per-request inference without re-loading the file on every call.

The `/classify` endpoint accepts a multipart image upload, applies the identical val-time preprocessing pipeline, runs a forward pass through `FoodClassifier`, and returns a JSON payload with the top-5 predictions and their softmax confidence scores.

### 5.7 Next.js API Routes

`nextjs/src/app/api/`

| Route | Method | Logic |
|---|---|---|
| `auth/register` | POST | Validate input → bcrypt hash → create user + optional profile → issue JWT cookie |
| `auth/login` | POST | Verify credentials against hash → issue JWT cookie |
| `auth/me` | GET | Decode JWT from `httpOnly` cookie → return `userId` and `username` |
| `auth/logout` | POST | Delete the JWT cookie |
| `upload` | POST | Receive image → forward to FastAPI `/classify` → threshold check → log entry + nutrition lookup |
| `log` | GET | Return today's food log entries and macro totals |
| `log/[id]` | DELETE | Remove one food log entry by ID |
| `log/history` | GET | Return last 7 days of food log grouped by date |
| `profile` | GET / PUT | Retrieve or update user profile; PUT auto-computes BMI and TDEE server-side |
| `foods` | GET | Full-text search of the food library by `name`, `display_name`, or `thai_name` |
| `foods/images` | GET | Return up to 3 representative training-set images for a given food class |
| `images/[...path]` | GET | Serve training-data images with private caching headers |
| `uploads/[...path]` | GET | Serve user-uploaded images with access control |

### 5.8 Frontend Pages

**Upload Page** (`src/app/upload/page.tsx`): The primary user interface. Supports drag-and-drop or file-picker selection. Displays a spinner during inference. On successful classification (confidence ≥ 0.6), renders the food name, a horizontal confidence bar chart for the top-5 candidates, a nutrition facts panel, and the remaining daily calorie allowance. Below-threshold responses display an error state with instructions to retake the photo.

**Library Page** (`src/app/library/page.tsx`): Searchable catalog of all 148 food classes with real-time filtering (350 ms debounce), sortable by name or caloric value, and a detail modal showing an image carousel (up to 3 training images) and a full macronutrient panel.

**Account Page** (`src/app/account/page.tsx`): Profile sidebar displaying BMI, TDEE, and daily calorie goal alongside an editable profile form with live TDEE calculation preview. The 7-day food log is grouped by date and supports per-entry deletion with a confirmation dialog.

### 5.9 Authentication System

`nextjs/src/lib/auth.ts` and `nextjs/src/middleware.ts`

JWT tokens (algorithm: HS256, expiration: 24 hours) are stored in `httpOnly`, `sameSite=lax` cookies. Passwords are hashed with bcryptjs at 12 salt rounds before database storage. Route middleware intercepts all requests to `/upload/*` and `/account/*`, verifies the JWT signature against `JWT_SECRET`, and redirects unauthenticated users to `/login`.

### 5.10 Health Calculation Logic

`nextjs/src/lib/utils.ts` and `nextjs/src/lib/db.ts`

**BMI**: `weight_kg / (height_cm / 100)²`

**TDEE (Mifflin-St Jeor)**:
```
BMR (male)   = 10 × weight_kg + 6.25 × height_cm − 5 × age + 5
BMR (female) = 10 × weight_kg + 6.25 × height_cm − 5 × age − 161
TDEE = BMR × activity_multiplier
```

| Activity Level | Multiplier |
|---|---|
| Sedentary | 1.200 |
| Light exercise | 1.375 |
| Moderate exercise | 1.550 |
| Heavy exercise | 1.725 |
| Athlete | 1.900 |

---

## 6. Training Method

### 6.1 Datasets

This project combines two Kaggle datasets into a unified 148-class food image corpus:

#### Food-101

| Property | Detail |
|---|---|
| Source | [kaggle.com/datasets/dansbecker/food-101](https://www.kaggle.com/datasets/dansbecker/food-101) |
| Original scope | 101 international food categories, 1,000 images each (101,000 total) |
| Why selected | Gold-standard benchmark for food classification; broad coverage of Western, Asian, and fusion cuisines; established train/test split with labeled ground truth |
| Classes contributed | ~101 classes (apple_pie, sushi, ramen, pizza, steak, pad_thai, etc.) |

#### FoodyDudy

| Property | Detail |
|---|---|
| Source | [kaggle.com/datasets/somboonthamgemmy/foodydudy](https://www.kaggle.com/datasets/somboonthamgemmy/foodydudy) |
| Content | Thai-specific food photographs with nutritional metadata |
| Why selected | Fills the critical gap in Food-101's coverage of Southeast Asian cuisine; includes dishes not found in any major Western food dataset |
| Classes contributed | ~47 Thai classes (mango_sticky_rice, green_papaya_salad, chicken_green_curry, pad_thai extensions, grilled_river_prawn, thai_pork_leg_stew, etc.) |

#### Combined Dataset Summary

| Split | Images | Batches (batch_size=16) |
|---|---|---|
| Train | ~35,520 | ~2,220 |
| Validation | ~10,000 | ~625 |
| Test | ~10,000 | ~625 |
| **Total** | **~55,520** | — |

A supplementary nutritional metadata file (`data/food_menu.csv`) provides kcal, protein, fat, carbohydrates, and sugar per serving for all 148 classes. This table is imported into the SQLite `foods` table during database initialization and linked to predictions at inference time.

### 6.2 Training Configuration

```python
CONFIG = {
    'num_classes':   148,
    'batch_size':    16,
    'num_epochs':    50,        # upper bound; early stopping may halt earlier
    'learning_rate': 1e-3,      # Phase 1 classifier head LR
    'weight_decay':  1e-4,
    'dropout_rate':  0.3,
    'patience':      7,         # early stopping patience
    'img_size':      224,
    'seed':          42,
}
```

### 6.3 Two-Phase Fine-Tuning Strategy

**Phase 1 — Head Pre-Warming (Epochs 1–10)**

The EfficientNet-B0 backbone is frozen entirely (all `backbone.parameters()` have `requires_grad=False`). Only the custom classifier head is trained. This prevents large gradients from a randomly initialized head from disrupting the carefully pre-trained ImageNet features before the head has converged to reasonable weights.

- Optimizer: `AdamW(params=classifier.parameters(), lr=1e-3, weight_decay=1e-4)`

**Phase 2 — Full Fine-Tuning (Epoch 11 onward)**

All weights are unfrozen. Differential learning rates prevent the backbone from being destabilized:

```python
optimizer = AdamW([
    {'params': model.backbone.parameters(),   'lr': 1e-5},
    {'params': model.classifier.parameters(), 'lr': 1e-4},
], weight_decay=1e-4)
```

### 6.4 Optimizer and Loss

| Hyperparameter | Value | Rationale |
|---|---|---|
| Optimizer | AdamW | Adam with decoupled weight decay prevents L2 penalty interfering with adaptive LR |
| Learning rate (Phase 1) | 1e-3 | Standard starting point for a fresh classifier head |
| Learning rate (backbone) | 1e-5 | Low enough to preserve pre-trained ImageNet features during fine-tuning |
| Weight decay | 1e-4 | Mild L2 regularization to prevent head overfitting |
| Loss function | CrossEntropyLoss(label_smoothing=0.1) | Smoothing reduces overconfidence on noisy labels common in web-scraped food images |
| LR Scheduler | CosineAnnealingLR(T_max=50, eta_min=1e-6) | Smooth decay avoids abrupt LR drops; eta_min prevents LR from reaching zero |
| Early stopping | patience=7, min_delta=1e-4 | Halts when val_loss stagnates; saves the best checkpoint automatically |

### 6.5 Augmentation Details

| Transform | Parameters | Purpose |
|---|---|---|
| `RandomResizedCrop(224)` | scale=(0.6, 1.0) | Simulate different distances and partial-dish compositions |
| `RandomHorizontalFlip` | p=0.5 | Plate orientation invariance |
| `RandomVerticalFlip` | p=0.1 | Occasional top-down food photography angles |
| `RandomRotation` | ±20° | Tilted plate or overhead shots |
| `ColorJitter` | brightness=0.4, contrast=0.4, saturation=0.3, hue=0.1 | Restaurant vs. natural lighting variance |
| `RandomGrayscale` | p=0.05 | Occasional monochrome or filter-heavy social media images |
| `RandomErasing` | p=0.1 | Occlusion robustness (hands, utensils partially blocking food) |
| `Normalize` | ImageNet μ=[0.485, 0.456, 0.406], σ=[0.229, 0.224, 0.225] | Match the distribution EfficientNet was pre-trained on |

### 6.6 Validation Approach

After every training epoch, the model switches to `eval()` mode and runs a full pass through `data/valid/` with no gradient computation (`torch.no_grad()`). Validation loss and accuracy are computed over all ~10,000 validation images. The checkpoint with the lowest cumulative validation loss is saved as `models/best_model.pth`.

### 6.7 Reproducibility

Global seed **42** is applied to Python `random`, NumPy, and PyTorch at initialization. On CUDA: `cudnn.deterministic=True` and `cudnn.benchmark=False` ensure bit-exact reproducibility across runs.

---

## 7. Model Evaluation

### 7.1 Training Run Summary

Training ran for **17 epochs** before the early stopping criterion was triggered (7 consecutive epochs without a `val_loss` improvement of ≥ 1e-4 following Phase 2 entry at epoch 11). The best checkpoint corresponds to epoch 17.

### 7.2 Per-Epoch Training History

| Epoch | Train Loss | Val Loss | Train Acc | Val Acc | Phase |
|---|---|---|---|---|---|
| 1 | 3.7611 | 2.9751 | 35.44% | 38.76% | 1 — frozen backbone |
| 2 | 3.3681 | 2.7618 | 40.21% | 46.01% | 1 |
| 3 | 3.2661 | 2.7200 | 42.24% | 47.25% | 1 |
| 4 | 3.1989 | 2.6825 | 43.66% | 48.02% | 1 |
| 5 | 3.1524 | 2.6041 | 45.89% | 51.28% | 1 |
| 6 | 3.1201 | 2.5694 | 46.76% | 52.43% | 1 |
| 7 | 3.0724 | 2.5699 | 47.31% | 51.73% | 1 |
| 8 | 3.0453 | 2.5462 | 48.56% | 52.61% | 1 |
| 9 | 3.0277 | 2.5491 | 48.63% | 52.27% | 1 |
| 10 | 3.0126 | 2.5318 | 48.86% | 53.18% | 1 |
| **11** | **2.7533** | **2.2109** | **60.07%** | **62.68%** | **2 — backbone unfrozen** |
| 12 | 2.5566 | 2.0941 | 64.11% | 66.55% | 2 |
| 13 | 2.4454 | 2.0465 | 66.69% | 67.88% | 2 |
| 14 | 2.3699 | 1.9777 | 68.52% | 70.23% | 2 |
| 15 | 2.3089 | 1.9429 | 70.24% | 70.83% | 2 |
| 16 | 2.2557 | 1.9071 | 71.73% | 72.12% | 2 |
| **17** | **2.2131** | **1.8692** | **73.22%** | **73.20%** | **2 — best checkpoint** |

> **Key observation**: The jump at epoch 11 — train loss drops from 3.01 to 2.75 and val accuracy from 53% to 62% in a single epoch — directly demonstrates the impact of unfreezing the backbone. Phase 1 pre-warms the head, preventing destructive gradients from entering the backbone on the first Phase 2 update.

### 7.3 Final Model Performance

| Metric | Value |
|---|---|
| Best Validation Loss | **1.8692** |
| Best Validation Accuracy | **73.20%** |
| Final Training Accuracy | 73.22% |
| Train/Val accuracy gap | ~0.02% (minimal overfitting) |

### 7.4 Test Set Evaluation

The test set (~10,000 held-out images, no overlap with train or validation) is evaluated after training using `notebooks/02_training.ipynb` — Section 8. Computed metrics include:

| Metric | Description |
|---|---|
| **Top-1 Accuracy** | Fraction of images where the highest-probability prediction matches the true label |
| **Top-5 Accuracy** | Fraction where the true label appears within the top-5 predictions (`sklearn.metrics.top_k_accuracy_score`) |
| **Macro F1-Score** | Unweighted mean F1 across all 148 classes — treats every class equally regardless of support |
| **Weighted F1-Score** | Support-weighted mean F1 — accounts for class imbalance |
| **Per-Class Report** | Precision, recall, F1, and support for each of the 148 classes |

### 7.5 Evaluation Visualizations

The following output artifacts are generated in `outputs/` by the training and EDA notebooks:

**Training Diagnostics (`notebooks/02_training.ipynb`)**

| File | Content |
|---|---|
| `outputs/training_loss_curve.png` | Training vs. validation loss over all 17 epochs |
| `outputs/training_accuracy_curve.png` | Training vs. validation accuracy over all 17 epochs |
| `outputs/training_lr_curve.png` | Learning rate schedule (log scale) — shows cosine decay for both phases |
| `outputs/training_confusion_matrix.png` | 20×20 heatmap of the top-20 most mutually confused class pairs |
| `outputs/training_misclassified_classes.png` | Horizontal bar chart — top 10 classes ranked by misclassification count |
| `outputs/training_sample_predictions.png` | 12 test images with predicted label, true label, and confidence (green = correct, red = wrong) |
| `outputs/training_sample_images.png` | 16 augmented training images with class labels |

**Exploratory Data Analysis (`notebooks/01_eda.ipynb`)**

| File | Content |
|---|---|
| `outputs/eda_class_distribution.png` | Histogram of per-class image count in the training split |
| `outputs/eda_split_boxplot.png` | Box plot comparing image counts across train/val/test splits |
| `outputs/eda_image_properties.png` | Distribution of image resolutions across the dataset |
| `outputs/eda_resolution_scatter.png` | Width vs. height scatter plot — identifies aspect ratio variance |
| `outputs/eda_sample_gallery.png` | Representative image gallery per class |
| `outputs/eda_kcal_distribution.png` | Calorie distribution across 148 food classes |
| `outputs/eda_top20_kcal.png` | 20 highest-calorie classes by serving |
| `outputs/eda_bottom20_kcal.png` | 20 lowest-calorie classes by serving |
| `outputs/eda_nutrition_correlation.png` | Correlation heatmap of kcal / protein / fat / carbs / sugar |
| `outputs/eda_nutrition_pairplot.png` | Pairwise scatter plot of all nutritional features |
| `outputs/eda_macro_breakdown.png` | Stacked macro-nutrient breakdown per food category |
| `outputs/eda_split_ratio_check.png` | Per-class train/val/test split ratio verification |
| `outputs/eda_channel_histogram.png` | RGB channel intensity histograms across the dataset |
| `outputs/eda_average_images.png` | Per-class average pixel intensity images |

### 7.6 Class Distribution

From `notebooks/01_eda.ipynb` dataset analysis:
- **Mean images per class (train)**: ~240
- **All 148 classes**: confirmed to have ≥ 200 training images
- **Imbalance ratio**: up to ~20× between the smallest and largest class — motivates `label_smoothing=0.1` to prevent the model from over-committing to frequent classes

---

## 8. Reference Articles and Related Work

### Foundational Papers

1. **EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks**
   Tan, M., & Le, Q. V. (2019). *Proceedings of the 36th International Conference on Machine Learning (ICML 2019)*.
   Introduces compound scaling — simultaneously scaling depth, width, and resolution by a fixed ratio — as the principle behind the EfficientNet family. EfficientNet-B0 is the direct backbone used in this project.

2. **Food-101 — Mining Discriminative Components with Random Forests**
   Bossard, L., Guillaumin, M., & Van Gool, L. (2014). *European Conference on Computer Vision (ECCV 2014)*.
   Establishes the Food-101 benchmark, documents the baseline accuracy achievable with handcrafted features, and motivates the need for learned representations. The dataset is the primary international-food component of this project's training corpus.

3. **Deep Residual Learning for Image Recognition**
   He, K., Zhang, X., Ren, S., & Sun, J. (2016). *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)*.
   Introduces residual (skip) connections — a design principle inherited by EfficientNet's MBConv blocks through the mobile inverted bottleneck architecture.

4. **MobileNetV2: Inverted Residuals and Linear Bottlenecks**
   Sandler, M., Howard, A., Zhu, M., Zhmoginov, A., & Chen, L.-C. (2018). *CVPR 2018*.
   Proposes the inverted residual block with linear bottleneck — the architectural primitive (MBConv) reused by EfficientNet.

5. **Decoupled Weight Decay Regularization (AdamW)**
   Loshchilov, I., & Hutter, F. (2019). *International Conference on Learning Representations (ICLR 2019)*.
   Shows that L2 regularization in Adam is not equivalent to weight decay due to the adaptive learning rate, and proposes AdamW as the corrected formulation — used as the optimizer throughout this project.

6. **When Does Label Smoothing Help?**
   Müller, R., Kornblith, S., & Hinton, G. E. (2019). *Advances in Neural Information Processing Systems (NeurIPS 2019)*.
   Analyzes when label smoothing improves calibration and out-of-distribution generalization — motivates the `label_smoothing=0.1` setting in `CrossEntropyLoss`.

7. **SGDR: Stochastic Gradient Descent with Warm Restarts**
   Loshchilov, I., & Hutter, F. (2017). *ICLR 2017*.
   Introduces cosine annealing as an LR schedule — the schedule adopted via `CosineAnnealingLR` in this project.

### Related Systems and Datasets

- **Im2Calories (Google, 2015)**: Estimated portion size and calorie content from food photos using deep CNNs. Demonstrated the commercial viability of vision-based calorie tracking — the conceptual predecessor to FoodLens.
- **VIREO Food-172**: A 172-class Chinese food dataset (Chen, J. et al., 2016) demonstrating that Asian cuisine requires dedicated, culturally specific training data — the same rationale behind including FoodyDudy for Thai food.
- **UEC Food-256**: 256-class Japanese food dataset that established fine-grained Asian food classification as an open research challenge.
- **DeepFood (2016)**: Applied deep CNNs to 821 food classes, showing that transfer learning from ImageNet substantially outperforms training from scratch for food recognition.

---

## 9. How to Run This Project

### 9.0 Files Not Included in This Repository

The following files are excluded from version control. You must create or generate them locally before the application will run:

| File / Directory | Why excluded | How to obtain |
|---|---|---|
| `data/` | ~55,000 training images (~10 GB) — too large for Git | Download from https://drive.google.com/drive/folders/1MH8qPJhZPvJUm2ueaYvXtWRE6Zk6x0N4?usp=sharing, extract the zip file and put the data folder on the root of project|
| `models/best_model.pth` | This file is too big(55mb) to push to GitHub | Download from https://drive.google.com/drive/folders/1MH8qPJhZPvJUm2ueaYvXtWRE6Zk6x0N4?usp=sharing and put it to the models folder|
| `database/app.db` | Runtime SQLite database | Auto-generated by running `python database/init_db.py` (see §9.5) |
| `nextjs/.env.local` | Contains `JWT_SECRET` — must never be committed | Create manually with the values shown in §9.8 |
| `outputs/` | Generated visualization PNGs from notebooks | Regenerated automatically when you run the notebooks (see §9.6) |
| `uploads/` | Runtime user-uploaded images | Created automatically when the first image is uploaded |

> **Minimum required to start the app**: complete steps §9.3 → §9.4 → §9.5 → §9.8. The model checkpoint (§9.6) is required for food classification to work.

### 9.1 Prerequisites

| Requirement | Minimum Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| PyTorch | 2.0+ |
| CUDA Toolkit (optional) | 11.8+ |

### 9.2 Clone the Repository

```bash
git clone https://github.com/napatr-j/Food_Calorie_Planning
cd Food_Calorie_Planning
```

### 9.3 Python Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS / Linux
source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt
```

> **GPU note**: For GPU-accelerated training or inference, install the correct CUDA-compatible PyTorch build from [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/) before running `pip install -r requirements.txt`.

### 9.4 Dataset Setup

1. Download **Food-101** from [Kaggle](https://www.kaggle.com/datasets/dansbecker/food-101)
2. Download **FoodyDudy** from [Kaggle](https://www.kaggle.com/datasets/somboonthamgemmy/foodydudy)
3. Organize the combined dataset into the structure below:

```
data/
├── train/
│   ├── apple_pie/          ← ~250 images per class
│   ├── pad_thai/
│   ├── mango_sticky_rice/
│   └── ...                 (148 class folders total)
├── valid/
│   └── ...                 (same 148 folders)
├── test/
│   └── ...                 (same 148 folders)
└── food_menu.csv           (nutritional metadata — kcal, protein, fat, carbs, sugar)
```

### 9.5 Database Initialization

```bash
cd database
python init_db.py
cd ..
```

This creates `database/app.db`, defines all tables with constraints and indexes, and imports nutritional data from `data/food_menu.csv` into the `foods` table.

### 9.6 Model Training (Skip if checkpoint already exists)

If `models/best_model.pth` is already present, skip this step. To train from scratch:

```bash
# Start Jupyter
jupyter notebook

# Run in order:
# 1. notebooks/01_eda.ipynb  → exploratory analysis, generates outputs/eda_*.png
# 2. notebooks/02_training.ipynb → training pipeline, saves models/best_model.pth
```

Training runs up to 50 epochs with early stopping. On CPU, Phase 1 (~10 epochs) takes several hours; Phase 2 fine-tuning adds additional time per epoch. A CUDA GPU is strongly recommended for full training runs.

### 9.7 AI Inference Service (FastAPI — Port 8000)

```bash
# From the project root, with venv activated
uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the service is running:

```bash
curl http://localhost:8000/health
# Expected response: {"status":"ok","service":"ai-inference"}
```

### 9.8 Frontend Application (Next.js — Port 3000)

```bash
cd nextjs

# Install Node dependencies
npm install

# Configure environment variables
# Edit nextjs/.env.local (create if not present):
```

**`nextjs/.env.local`**:
```env
JWT_SECRET=your-secure-random-secret-key-change-this-in-production
AI_SERVICE_URL=http://localhost:8000
```

```bash
# Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 9.9 Running Both Services

Open two terminal windows simultaneously:

**Terminal 1 — AI Inference Service:**
```bash
cd Food_Calorie_Planning
venv\Scripts\activate         # Windows
# source venv/bin/activate   # macOS / Linux
uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd Food_Calorie_Planning/nextjs
npm run dev
```

### 9.10 Application Walkthrough

| Step | Action |
|---|---|
| 1 | Visit [http://localhost:3000/register](http://localhost:3000/register) and create an account |
| 2 | Optionally enter your height, weight, age, gender, and activity level for TDEE calculation |
| 3 | Go to [http://localhost:3000/upload](http://localhost:3000/upload) and drag-and-drop a food photo |
| 4 | View the top-5 AI predictions with confidence bars and the nutrition facts for the classified dish |
| 5 | Browse all 148 foods at [http://localhost:3000/library](http://localhost:3000/library) |
| 6 | Check your 7-day history and edit your health profile at [http://localhost:3000/account](http://localhost:3000/account) |

### 9.11 Production Build

```bash
cd nextjs
npm run build
npm start           # Runs the optimized production build on port 3000
```

---

## 10. Project Structure

```
Food_Calorie_Planning/
│
├── ai_service/                          # FastAPI AI microservice (port 8000)
│   ├── main.py                         # App factory, CORS, /health & /classify endpoints
│   ├── inference.py                    # Checkpoint loading, preprocessing, forward pass, top-5 output
│   └── __init__.py
│
├── database/                            # Database layer
│   ├── init_db.py                      # Schema DDL, table constraints, indexes, CSV import bootstrap
│   ├── queries.py                      # Python DB helpers (legacy — superseded by nextjs/src/lib/db.ts)
│   └── app.db                          # SQLite database (auto-generated on first init_db.py run)
│
├── models/                              # ML model artifacts
│   ├── best_model.pth                  # Full PyTorch checkpoint: model weights + optimizer + metadata
│   ├── class_names.json                # Ordered array of 148 class label strings (snake_case)
│   └── training_history.json           # Per-epoch: train_loss, val_loss, train_acc, val_acc, lr
│
├── notebooks/                           # Jupyter analysis and training notebooks
│   ├── 01_eda.ipynb                    # Dataset EDA: class balance, resolution, nutrition statistics
│   └── 02_training.ipynb               # Full pipeline: model definition → training → evaluation → export
│
├── nextjs/                              # Next.js 14 frontend application (port 3000)
│   ├── src/
│   │   ├── app/                        # Next.js App Router
│   │   │   ├── page.tsx                # Root → redirect to /upload
│   │   │   ├── layout.tsx              # Root layout with Navbar
│   │   │   ├── upload/page.tsx         # Image upload, classification UI, calorie log
│   │   │   ├── library/page.tsx        # Searchable food catalog with nutrition modal
│   │   │   ├── account/page.tsx        # User profile, BMI/TDEE display, 7-day log
│   │   │   ├── login/page.tsx          # JWT login form
│   │   │   ├── register/page.tsx       # Registration with optional health profile
│   │   │   ├── about/page.tsx          # Project information page
│   │   │   └── api/                    # REST API route handlers
│   │   │       ├── auth/               # register, login, me, logout
│   │   │       ├── upload/route.ts     # Image → FastAPI → threshold → DB log
│   │   │       ├── log/                # Daily log retrieval, history, delete entry
│   │   │       ├── profile/route.ts    # Profile CRUD with auto BMI/TDEE
│   │   │       ├── foods/              # Library search + representative image serving
│   │   │       ├── images/[...path]    # Training image file server
│   │   │       └── uploads/[...path]   # User-uploaded image file server
│   │   ├── components/                 # Reusable UI components
│   │   │   ├── navbar.tsx              # Top navigation with user dropdown
│   │   │   ├── calorie-bar.tsx         # Macro progress bars + daily remaining indicator
│   │   │   └── food-card.tsx           # Clickable food grid card for the library
│   │   ├── lib/                        # Shared utility modules
│   │   │   ├── auth.ts                 # JWT sign/verify, bcrypt helpers
│   │   │   ├── db.ts                   # Libsql SQLite client + all CRUD query functions
│   │   │   ├── types.ts                # TypeScript interfaces: User, Profile, FoodLog, Food
│   │   │   └── utils.ts                # TDEE / BMI formulas, display formatters
│   │   └── middleware.ts               # Route guard: /upload/* /account/* → JWT check
│   ├── package.json                    # Node dependencies and npm scripts
│   ├── tsconfig.json                   # TypeScript compiler configuration
│   ├── tailwind.config.ts              # Tailwind CSS theme customization
│   ├── postcss.config.js               # PostCSS + Autoprefixer config
│   └── .env.local                      # JWT_SECRET, AI_SERVICE_URL (not committed)
│
├── data/                                # Image dataset (not committed — download from Kaggle)
│   ├── train/                          # ~35,520 images across 148 class subdirectories
│   ├── valid/                          # ~10,000 validation images
│   ├── test/                           # ~10,000 test images
│   └── food_menu.csv                   # Nutritional metadata for all 148 classes
│
├── outputs/                             # Generated analysis and training visualizations
│   ├── eda_*.png                       # 14 EDA plots from 01_eda.ipynb
│   └── training_*.png                  # 7 training/evaluation plots from 02_training.ipynb
│
├── uploads/                             # User-uploaded food images (runtime, not committed)
│   └── {userId}/                       # Per-user image storage directory
│
├── venv/                                # Python virtual environment (not committed)
├── requirements.txt                     # Python package dependencies (pinned versions)
└── README.md                            # This file
```

### Dependency Summary

**Python** (`requirements.txt`)

```
fastapi==0.128.0           # Web framework for AI service
uvicorn[standard]==0.40.0  # ASGI server
torch>=2.0.0               # Deep learning framework
torchvision>=0.15.0        # Pre-trained models and transforms
Pillow>=10.0.0             # Image I/O
pandas>=2.0.0              # Data analysis in notebooks
python-multipart==0.0.27   # Multipart form data (file upload)
requests==2.32.5           # HTTP client
streamlit==1.52.2          # Optional interactive UI for demos
```

**Node.js** (`nextjs/package.json`)

```
next: 14.2                 # Full-stack React framework
react / react-dom: 18.3    # UI library
typescript: 5.x            # Type safety
tailwindcss: 3.4           # Utility-first CSS
@libsql/client             # SQLite driver (Turso/libsql compatible)
jose                       # JWT signing and verification (Edge-compatible)
bcryptjs                   # Password hashing
lucide-react               # Icon set
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | Next.js (App Router) | 14.2 |
| UI Library | React + TypeScript | 18.3 / 5.x |
| Styling | Tailwind CSS | 3.4 |
| AI Inference API | FastAPI + Uvicorn | 0.128 / 0.40 |
| ML Framework | PyTorch + TorchVision | 2.0+ / 0.15+ |
| Model Backbone | EfficientNet-B0 (ImageNet pre-trained) | — |
| Database | SQLite via @libsql/client | — |
| Authentication | JWT (jose) + bcryptjs | — |
| Analysis Environment | Jupyter Notebooks | — |

---

*This project was developed as a deep learning project, demonstrating end-to-end ML engineering: from multi-source dataset curation and EfficientNet transfer learning through FastAPI model serving and Next.js full-stack deployment — with a focus on real-world applicability to Thai dietary tracking.*
