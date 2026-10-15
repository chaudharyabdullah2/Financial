"""Shared preprocessing, model building, and inference helpers.

Both train.py and app.py import from here so text is cleaned exactly the
same way at training time and prediction time.
"""
import json
import os
import re
import weakref

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "financial_sentiment.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
REPORT_DIR = os.path.join(BASE_DIR, "reports")
MODEL_PATH = os.path.join(MODEL_DIR, "sentiment_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

LABELS = ["negative", "neutral", "positive"]
COLUMN_ALIASES = {"sentence": "text", "sentiment": "label"}


def clean_text(text):
    text = re.sub(r"<[^>]+>", " ", str(text))
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def load_dataset(path=DATA_PATH):
    """Load the CSV, normalise columns/labels, and remove duplicates.

    Returns (dataframe, stats) where stats records how many rows were dropped
    at each step, so the numbers can be reported alongside the model.
    """
    df = pd.read_csv(path)
    df = df.rename(columns={c: COLUMN_ALIASES.get(c.lower(), c.lower()) for c in df.columns})
    missing = {"text", "label"} - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required column(s): {sorted(missing)}")

    stats = {"raw_rows": len(df)}
    df = df[["text", "label"]].dropna()
    df["text"] = df["text"].map(clean_text)
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    df = df[(df["text"] != "") & df["label"].isin(LABELS)]
    stats["valid_rows"] = len(df)

    # Some sentences appear twice with different labels. In the bundled data
    # these are all negative/neutral pairs on clearly negative sentences
    # ("operating profit fell...", "1,100 employees lose their jobs"), so the
    # neutral copy is the noise: resolve to the single non-neutral label. Texts
    # labelled both positive and negative are genuinely ambiguous and dropped.
    label_sets = df.groupby("text")["label"].agg(lambda s: frozenset(s))
    resolved, dropped = {}, 0
    for text, labels in label_sets[label_sets.map(len) > 1].items():
        polar = labels - {"neutral"}
        if len(polar) == 1:
            resolved[text] = next(iter(polar))
        else:
            dropped += 1
    df = df[df["text"].map(lambda t: len(label_sets[t]) == 1 or t in resolved)].copy()
    df["label"] = df["text"].map(resolved).fillna(df["label"])
    stats["conflicts_resolved"] = len(resolved)
    stats["conflicts_dropped"] = dropped

    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    stats["final_rows"] = len(df)
    stats["class_counts"] = {k: int(v) for k, v in df["label"].value_counts().reindex(LABELS, fill_value=0).items()}
    return df, stats


def word_features():
    return TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.95, sublinear_tf=True)


def word_char_features():
    # Character n-grams help with tickers, numbers, and morphological variants
    # ("profit", "profits", "profitable") that word n-grams treat as unrelated.
    return FeatureUnion([
        ("word", word_features()),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True)),
    ])


def build_candidates():
    """Candidate pipelines and their hyperparameter grids.

    Every final model exposes predict_proba (the SVM via calibration) so the
    app can show meaningful confidence scores.
    """
    return {
        "Logistic Regression": (
            Pipeline([
                ("features", word_char_features()),
                ("model", LogisticRegression(max_iter=3000, class_weight="balanced")),
            ]),
            {"model__C": [1.0, 5.0, 10.0]},
        ),
        "Linear SVM (calibrated)": (
            Pipeline([
                ("features", word_char_features()),
                ("model", CalibratedClassifierCV(LinearSVC(class_weight="balanced"), cv=3)),
            ]),
            {"model__estimator__C": [0.25, 0.5, 1.0]},
        ),
        "Naive Bayes": (
            Pipeline([
                ("features", word_features()),
                ("model", MultinomialNB()),
            ]),
            {"model__alpha": [0.1, 0.5, 1.0]},
        ),
    }


def load_model(path=MODEL_PATH):
    return joblib.load(path)


def load_metadata(path=METADATA_PATH):
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def predict(model, texts):
    """Return a DataFrame with the predicted label and per-class probabilities."""
    cleaned = [clean_text(t) for t in texts]
    proba = model.predict_proba(cleaned)
    classes = list(model.classes_)
    out = pd.DataFrame(proba, columns=[f"p_{c}" for c in classes])
    out.insert(0, "prediction", [classes[i] for i in proba.argmax(axis=1)])
    out.insert(1, "confidence", proba.max(axis=1))
    return out


def _class_weights(model):
    """Per-class feature weights (n_classes x n_features) for linear models."""
    if hasattr(model, "coef_"):
        return np.asarray(model.coef_)
    if isinstance(model, CalibratedClassifierCV):
        return np.mean([c.estimator.coef_ for c in model.calibrated_classifiers_], axis=0)
    if hasattr(model, "feature_log_prob_"):
        logp = model.feature_log_prob_
        return logp - logp.mean(axis=0, keepdims=True)
    return None


_EXPLAINERS = weakref.WeakKeyDictionary()


def _explainer(model):
    """Per-model cache of feature names, word-feature mask and class weights.

    get_feature_names_out() materialises every n-gram name (hundreds of
    thousands with character n-grams), so computing it per request costs
    seconds; the cache makes explanations effectively free.
    """
    cached = _EXPLAINERS.get(model)
    if cached is None:
        names = model.named_steps["features"].get_feature_names_out()
        is_word = ~np.char.startswith(names.astype(str), "char__")
        cached = (names, is_word, _class_weights(model.named_steps["model"]))
        _EXPLAINERS[model] = cached
    return cached


def _contributions(model, row, label, top_n):
    names, is_word, weights = _explainer(model)
    if weights is None:
        return []
    class_idx = list(model.named_steps["model"].classes_).index(label)
    contributions = [
        (str(names[j]).removeprefix("word__"), float(value * weights[class_idx, j]))
        for j, value in zip(row.indices, row.data)
        if is_word[j] and value * weights[class_idx, j] > 0
    ]
    contributions.sort(key=lambda kv: kv[1], reverse=True)
    return contributions[:top_n]


def explain(model, text, label, top_n=8):
    """Word/phrase features in `text` that pushed hardest toward `label`.

    Returns a list of (term, weight) pairs, strongest first. Character n-gram
    features are skipped because they are not readable on their own.
    """
    row = model.named_steps["features"].transform([clean_text(text)]).tocsr()
    return _contributions(model, row, label, top_n)


def analyze(model, text, top_n=8):
    """Full single-text analysis: prediction, probabilities, and supporting
    terms for every class, plus how much of the text the model recognised."""
    result = predict(model, [text]).iloc[0]
    label = result["prediction"]
    row = model.named_steps["features"].transform([clean_text(text)]).tocsr()
    _, is_word, _ = _explainer(model)
    by_class = {c: _contributions(model, row, c, top_n) for c in model.classes_}
    return {
        "prediction": label,
        "confidence": float(result["confidence"]),
        "probabilities": {c: float(result[f"p_{c}"]) for c in model.classes_},
        "explanation": by_class[label],
        "explanations_by_class": by_class,
        "cleaned_text": clean_text(text),
        "known_terms": int(is_word[row.indices].sum()),
    }


def top_terms(model, top_n=15):
    """Globally strongest word/phrase features for each class."""
    names, is_word, weights = _explainer(model)
    if weights is None:
        return {}
    word_idx = np.flatnonzero(is_word)
    out = {}
    for k, label in enumerate(model.named_steps["model"].classes_):
        w = weights[k, word_idx]
        order = np.argsort(w)[::-1][:top_n]
        out[label] = [(str(names[word_idx[i]]).removeprefix("word__"), float(w[i])) for i in order]
    return out
