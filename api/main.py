"""FastAPI service exposing the sentiment model.

Run from the project root:
    python -m uvicorn api.main:app --reload --port 8000
Interactive docs: http://localhost:8000/docs
"""
import io
import json
import os
import threading
import time

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

import sys
from pathlib import Path

<<<<<<< HEAD
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
=======
PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
>>>>>>> 465df17a06fb5ccb06d5de546c1140b57fca4749

import sentiment_core as core

API_VERSION = "2.0.0"
MAX_TEXT_CHARS = 5_000
MAX_BATCH_TEXTS = 1_000
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_FILE_ROWS = 50_000
EXAMPLES = [
    {"label": "Earnings beat", "text": "The company reported strong quarterly earnings and expects higher revenue next year."},
    {"label": "Profit warning", "text": "Shares plunged after the firm issued a profit warning and cut its dividend."},
    {"label": "Corporate notice", "text": "The annual general meeting will be held in Helsinki on 15 March."},
    {"label": "Layoffs", "text": "The pulp mill will be closed and about 1,100 employees will lose their jobs."},
    {"label": "Guidance raise", "text": "Operating profit rose to EUR 13.1 mn and the outlook for the full year was raised."},
    {"label": "Market chatter", "text": "$SPY wouldn't be surprised to see a green close today"},
]

app = FastAPI(title="Polarity API", version=API_VERSION,
              description="Financial sentiment classification (negative / neutral / positive).")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
STARTED_AT = time.time()


def _mtime(path):
    return os.path.getmtime(path) if os.path.exists(path) else None


class ModelStore:
    """Loads the model lazily and reloads it when train.py writes a new one."""

    def __init__(self):
        self._lock = threading.Lock()
        self._mtime = None
        self._model = None
        self._stats_key = None
        self._stats = None

    def get(self):
        mtime = _mtime(core.MODEL_PATH)
        if mtime is None:
            raise HTTPException(503, "Model not found. Run `python train.py` from the project root first.")
        with self._lock:
            if mtime != self._mtime:
                model = core.load_model(core.MODEL_PATH)
                if not hasattr(model, "predict_proba"):
                    raise HTTPException(503, "Model was saved by an older train.py. Re-run `python train.py`.")
                core.top_terms(model, 1)  # warm the explanation cache so the first request is fast
                self._model, self._mtime = model, mtime
            return self._model

    @property
    def loaded(self):
        return self._model is not None

    def statistics(self):
        model = self.get()
        key = (self._mtime, _mtime(core.DATA_PATH))
        with self._lock:
            if key != self._stats_key:
                self._stats = _compute_statistics(model)
                self._stats_key = key
            return self._stats


store = ModelStore()


def _read_json(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _compute_statistics(model):
    df, stats = core.load_dataset(core.DATA_PATH)
    words = df["text"].str.split().str.len()
    edges = [0, 10, 15, 20, 25, 30, 40, 50, 75, 1_000]
    buckets = pd.cut(words, edges, right=False, labels=[f"{a}–{b - 1}" if b < 1_000 else f"{a}+" for a, b in zip(edges, edges[1:])])
    hist = pd.crosstab(buckets, df["label"]).reindex(columns=core.LABELS, fill_value=0)
    return {
        "dataset": stats,
        "avg_words": float(words.mean()),
        "median_words": float(words.median()),
        "avg_words_by_class": {k: float(v) for k, v in words.groupby(df["label"]).mean().items()},
        "length_histogram": [{"bucket": str(b), **{c: int(hist.loc[b, c]) for c in core.LABELS}} for b in hist.index],
        "top_terms": {k: [{"term": t, "weight": w} for t, w in v] for k, v in core.top_terms(model, 15).items()},
    }


def _summary(preds):
    counts = preds["prediction"].value_counts().reindex(core.LABELS, fill_value=0)
    return {
        "total": int(len(preds)),
        "counts": {k: int(v) for k, v in counts.items()},
        "mean_confidence": float(preds["confidence"].mean()) if len(preds) else 0.0,
    }


def _rows(texts, preds):
    return [
        {
            "text": t,
            "prediction": p.prediction,
            "confidence": float(p.confidence),
            "probabilities": {c: float(getattr(p, f"p_{c}")) for c in core.LABELS},
        }
        for t, p in zip(texts, preds.itertuples(index=False))
    ]


class PredictRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_CHARS)
    top_n: int = Field(8, ge=1, le=25)

    @field_validator("text")
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError("Text must contain at least one non-whitespace character.")
        return v


class BatchRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=MAX_BATCH_TEXTS)


@app.get("/api/health")
def health():
    model_ok = os.path.exists(core.MODEL_PATH)
    meta = core.load_metadata() if model_ok else {}
    return {
        "status": "ok" if model_ok else "degraded",
        "model_available": model_ok,
        "model_loaded": store.loaded,
        "model": meta.get("best_model"),
        "trained_at": meta.get("trained_at"),
        "api_version": API_VERSION,
        "uptime_seconds": round(time.time() - STARTED_AT, 1),
    }


@app.get("/api/model-info")
def model_info():
    meta = core.load_metadata()
    if not meta:
        raise HTTPException(503, "No model metadata. Run `python train.py` first.")
    comparison_path = os.path.join(core.REPORT_DIR, "model_comparison.csv")
    comparison = []
    if os.path.exists(comparison_path):
        df = pd.read_csv(comparison_path).replace({np.nan: None})
        df["best_params"] = df["best_params"].map(lambda s: json.loads(s) if isinstance(s, str) else {})
        comparison = df.to_dict(orient="records")
    report = _read_json(os.path.join(core.REPORT_DIR, "classification_report.json")) or {}
    per_class = [
        {"label": c, "precision": report[c]["precision"], "recall": report[c]["recall"],
         "f1": report[c]["f1-score"], "support": int(report[c]["support"])}
        for c in core.LABELS if c in report
    ]
    errors_path = os.path.join(core.REPORT_DIR, "misclassified_examples.csv")
    errors = pd.read_csv(errors_path).head(50).to_dict(orient="records") if os.path.exists(errors_path) else []
    return {
        "metadata": meta,
        "comparison": comparison,
        "per_class": per_class,
        "confusion_matrix": _read_json(os.path.join(core.REPORT_DIR, "confusion_matrix.json")),
        "misclassified": errors,
    }


@app.get("/api/statistics")
def statistics():
    return store.statistics()


@app.get("/api/examples")
def examples():
    return EXAMPLES


@app.post("/api/predict")
def predict(req: PredictRequest):
    model = store.get()
    start = time.perf_counter()
    result = core.analyze(model, req.text, req.top_n)
    result["explanation"] = [{"term": t, "weight": w} for t, w in result["explanation"]]
    result["explanations_by_class"] = {
        k: [{"term": t, "weight": w} for t, w in v] for k, v in result["explanations_by_class"].items()
    }
    result["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
    result["model"] = core.load_metadata().get("best_model")
    return result


@app.post("/api/predict/batch")
def predict_batch(req: BatchRequest):
    model = store.get()
    texts = [t if isinstance(t, str) else "" for t in req.texts]
    start = time.perf_counter()
    preds = core.predict(model, texts)
    return {
        "results": _rows(texts, preds),
        "summary": _summary(preds),
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }


def _read_csv(raw):
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(raw), encoding=encoding)
        except UnicodeDecodeError:
            continue
        except Exception as exc:
            raise HTTPException(422, f"Could not parse CSV: {exc}")
    raise HTTPException(422, "Could not decode CSV (tried UTF-8 and Latin-1).")


def _guess_text_column(df):
    for name in df.columns:
        if str(name).lower() in ("text", "sentence", "headline", "title", "content"):
            return name
    text_cols = [c for c in df.columns if df[c].dtype == object]
    if not text_cols:
        return df.columns[0]
    return max(text_cols, key=lambda c: df[c].astype(str).str.len().mean())


@app.post("/api/predict/file")
async def predict_file(file: UploadFile = File(...), column: str | None = Form(None)):
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise HTTPException(415, "Please upload a .csv file.")
    raw = await file.read(MAX_FILE_BYTES + 1)
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(413, f"File is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB.")
    if not raw.strip():
        raise HTTPException(422, "The file is empty.")
    df = _read_csv(raw)
    if df.empty:
        raise HTTPException(422, "The CSV has no data rows.")
    columns = [str(c) for c in df.columns]
    df.columns = columns
    if column is not None and column not in columns:
        raise HTTPException(422, f"Column '{column}' not found. Available: {columns}")
    used = column or _guess_text_column(df)

    truncated = len(df) > MAX_FILE_ROWS
    texts = df[used].head(MAX_FILE_ROWS).fillna("").astype(str).tolist()
    model = store.get()
    start = time.perf_counter()
    preds = core.predict(model, texts)
    return {
        "filename": file.filename,
        "columns": columns,
        "column": used,
        "total_rows": int(len(df)),
        "truncated": truncated,
        "results": _rows(texts, preds),
        "summary": _summary(preds),
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }


@app.get("/")
def root():
    return {"name": "Polarity API", "version": API_VERSION, "docs": "/docs"}
