"""Run with:  python -m unittest discover tests   (or: python -m pytest)"""
import json
import os
import sys
import tempfile
import unittest

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentiment_core import LABELS, clean_text, explain, load_dataset, load_model, predict  # noqa: E402
from train import train  # noqa: E402

COMPANIES = ["acme", "globex", "initech", "umbrella", "stark", "wayne", "hooli", "vandelay", "soylent", "tyrell"]
TEMPLATES = {
    "positive": ["{c} profit rose sharply and revenue grew strongly", "{c} shares surged after record earnings beat"],
    "negative": ["{c} profit fell sharply and losses widened", "{c} shares plunged after weak earnings warning"],
    "neutral": ["{c} will hold its annual meeting in march", "{c} announced the board composition for the year"],
}


def synthetic_rows():
    rows = []
    for label, templates in TEMPLATES.items():
        for template in templates:
            for i, company in enumerate(COMPANIES):
                rows.append({"Sentence": template.format(c=company) + f" in quarter {i}", "Sentiment": label})
    return rows


class CleanTextTests(unittest.TestCase):
    def test_strips_html_urls_and_whitespace(self):
        self.assertEqual(clean_text("<b>Profit</b>  UP  see https://x.com/a now"), "profit up see now")

    def test_handles_non_strings(self):
        self.assertEqual(clean_text(42), "42")


class LoadDatasetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "data.csv")

    def tearDown(self):
        self.tmp.cleanup()

    def load(self, rows):
        pd.DataFrame(rows).to_csv(self.path, index=False)
        return load_dataset(self.path)

    def test_renames_columns_and_normalises_labels(self):
        df, stats = self.load([{"Sentence": "Profit up", "Sentiment": " Positive "}])
        self.assertEqual(list(df.columns), ["text", "label"])
        self.assertEqual(df.iloc[0]["label"], "positive")
        self.assertEqual(stats["final_rows"], 1)

    def test_resolves_neutral_conflicts_and_drops_polar_conflicts(self):
        df, stats = self.load([
            {"text": "profit fell", "label": "neutral"},
            {"text": "profit fell", "label": "negative"},
            {"text": "mixed news", "label": "positive"},
            {"text": "mixed news", "label": "negative"},
            {"text": "Same  sentence", "label": "neutral"},
            {"text": "same sentence", "label": "neutral"},
            {"text": "bad label", "label": "bullish"},
        ])
        self.assertEqual(dict(zip(df["text"], df["label"])), {"profit fell": "negative", "same sentence": "neutral"})
        self.assertEqual((stats["conflicts_resolved"], stats["conflicts_dropped"]), (1, 1))

    def test_missing_columns_raise(self):
        with self.assertRaises(ValueError):
            self.load([{"headline": "x", "label": "neutral"}])


class EndToEndTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        data = os.path.join(cls.tmp.name, "data.csv")
        pd.DataFrame(synthetic_rows()).to_csv(data, index=False)
        cls.model_dir = os.path.join(cls.tmp.name, "models")
        cls.report_dir = os.path.join(cls.tmp.name, "reports")
        cls.metadata = train(data, cls.model_dir, cls.report_dir, cv_folds=3, n_jobs=1)
        cls.model = load_model(os.path.join(cls.model_dir, "sentiment_model.joblib"))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_artifacts_written(self):
        for name in ["model_comparison.csv", "confusion_matrix.png", "classification_report.json",
                     "misclassified_examples.csv"]:
            self.assertTrue(os.path.exists(os.path.join(self.report_dir, name)), name)
        with open(os.path.join(self.model_dir, "metadata.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f)["classes"], LABELS)

    def test_predict_returns_probabilities(self):
        out = predict(self.model, ["Profit rose sharply", "Shares plunged after weak earnings"])
        self.assertEqual(list(out["prediction"]), ["positive", "negative"])
        probs = out[[f"p_{c}" for c in LABELS]].sum(axis=1)
        self.assertTrue(((probs - 1).abs() < 1e-6).all())

    def test_explain_returns_supporting_terms(self):
        terms = dict(explain(self.model, "Shares plunged after weak earnings", "negative"))
        self.assertTrue({"plunged", "weak"} & set(terms), terms)
        self.assertTrue(all(w > 0 for w in terms.values()))


if __name__ == "__main__":
    unittest.main()
