import argparse
import json
import os
import platform
import time
from datetime import datetime, timezone

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

from sentiment_core import (
    DATA_PATH,
    LABELS,
    MODEL_DIR,
    REPORT_DIR,
    build_candidates,
    load_dataset,
)


def save_confusion_matrices(y_true, y_pred, title, path):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
    for ax, normalize, subtitle in [(axes[0], None, "Counts"), (axes[1], "true", "Row-normalised (recall)")]:
        cm = confusion_matrix(y_true, y_pred, labels=LABELS, normalize=normalize)
        ConfusionMatrixDisplay(cm, display_labels=LABELS).plot(
            ax=ax, cmap="Blues", colorbar=False, values_format=".2f" if normalize else "d"
        )
        ax.set_title(subtitle)
    fig.suptitle("Confusion Matrix - " + title)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def train(data_path=DATA_PATH, model_dir=MODEL_DIR, report_dir=REPORT_DIR,
          test_size=0.20, seed=42, cv_folds=5, refit_full=False, n_jobs=-1):
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(report_dir, exist_ok=True)

    df, data_stats = load_dataset(data_path)
    print(f"Loaded {data_stats['final_rows']} rows (raw {data_stats['raw_rows']}; "
          f"label conflicts: {data_stats['conflicts_resolved']} resolved, {data_stats['conflicts_dropped']} dropped)")
    print("Class counts:", data_stats["class_counts"])

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=test_size, random_state=seed, stratify=df["label"]
    )
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=seed)

    # Model and hyperparameters are chosen by cross-validated macro F1 on the
    # training split only; the test split is touched once per model for
    # reporting, never for selection. Macro F1 is used because the classes are
    # imbalanced (negative is the smallest) and weighted F1 hides that.
    results, fitted = [], {}
    for name, (pipeline, grid) in build_candidates().items():
        print(f"\nTraining: {name}")
        start = time.perf_counter()
        search = GridSearchCV(pipeline, grid, scoring="f1_macro", cv=cv, n_jobs=n_jobs)
        search.fit(X_train, y_train)
        pred = search.best_estimator_.predict(X_test)
        cv_std = search.cv_results_["std_test_score"][search.best_index_]
        results.append({
            "model": name,
            "cv_macro_f1": search.best_score_,
            "cv_macro_f1_std": cv_std,
            "test_accuracy": accuracy_score(y_test, pred),
            "test_macro_f1": f1_score(y_test, pred, average="macro"),
            "test_weighted_f1": f1_score(y_test, pred, average="weighted"),
            "best_params": json.dumps(search.best_params_),
            "train_seconds": round(time.perf_counter() - start, 1),
        })
        fitted[name] = search
        print(f"  CV macro F1 {search.best_score_:.4f} ± {cv_std:.4f} | params {search.best_params_}")
        print(classification_report(y_test, pred, labels=LABELS, zero_division=0))

    comparison = pd.DataFrame(results).sort_values("cv_macro_f1", ascending=False)
    comparison.to_csv(os.path.join(report_dir, "model_comparison.csv"), index=False)

    best_name = comparison.iloc[0]["model"]
    best_model = fitted[best_name].best_estimator_
    test_pred = best_model.predict(X_test)
    report = classification_report(y_test, test_pred, labels=LABELS, zero_division=0, output_dict=True)
    with open(os.path.join(report_dir, "classification_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    save_confusion_matrices(y_test, test_pred, best_name, os.path.join(report_dir, "confusion_matrix.png"))
    with open(os.path.join(report_dir, "confusion_matrix.json"), "w", encoding="utf-8") as f:
        json.dump({
            "labels": LABELS,
            "counts": confusion_matrix(y_test, test_pred, labels=LABELS).tolist(),
            "normalized": confusion_matrix(y_test, test_pred, labels=LABELS, normalize="true").round(4).tolist(),
        }, f, indent=2)

    proba = best_model.predict_proba(X_test)
    errors = pd.DataFrame({"text": X_test, "true": y_test, "predicted": test_pred, "confidence": proba.max(axis=1)})
    errors = errors[errors["true"] != errors["predicted"]].sort_values("confidence", ascending=False)
    errors.to_csv(os.path.join(report_dir, "misclassified_examples.csv"), index=False)

    if refit_full:
        print("\nRefitting best model on the full dataset...")
        best_model = clone(best_model).fit(df["text"], df["label"])

    joblib.dump(best_model, os.path.join(model_dir, "sentiment_model.joblib"))
    best_row = comparison.iloc[0]
    metadata = {
        "best_model": best_name,
        "best_params": json.loads(best_row["best_params"]),
        "selection_metric": "cv_macro_f1",
        "cv_macro_f1": float(best_row["cv_macro_f1"]),
        "test_accuracy": float(best_row["test_accuracy"]),
        "test_macro_f1": float(best_row["test_macro_f1"]),
        "test_weighted_f1": float(best_row["test_weighted_f1"]),
        "classes": LABELS,
        "trained_on": "full dataset" if refit_full else "train split",
        "train_size": int(len(df) if refit_full else len(X_train)),
        "test_size": int(len(X_test)),
        "data": data_stats,
        "seed": seed,
        "cv_folds": cv_folds,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "versions": {"python": platform.python_version(), "scikit-learn": sklearn.__version__},
    }
    with open(os.path.join(model_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("\n================================")
    print("TRAINING COMPLETE")
    print(comparison[["model", "cv_macro_f1", "test_macro_f1", "test_accuracy"]].to_string(index=False))
    print("Best model:", best_name)
    print("Model saved in", model_dir)
    print("Reports saved in", report_dir)
    print("================================")
    return metadata


def parse_args():
    parser = argparse.ArgumentParser(description="Train the financial sentiment classifier.")
    parser.add_argument("--data", default=DATA_PATH, help="CSV with text/label (or Sentence/Sentiment) columns")
    parser.add_argument("--model-dir", default=MODEL_DIR)
    parser.add_argument("--report-dir", default=REPORT_DIR)
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cv-folds", type=int, default=5)
    parser.add_argument("--refit-full", action="store_true",
                        help="After evaluation, refit the chosen model on all data before saving")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args.data, args.model_dir, args.report_dir, args.test_size, args.seed, args.cv_folds, args.refit_full)
