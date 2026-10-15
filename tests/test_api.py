"""API tests against the trained model in models/. Skipped if it has not been trained yet."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sentiment_core as core  # noqa: E402

try:
    from fastapi.testclient import TestClient

    from api.main import app
except ImportError:  # fastapi/httpx not installed
    app = None


@unittest.skipIf(app is None or not os.path.exists(core.MODEL_PATH), "needs fastapi, httpx and a trained model")
class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        body = self.client.get("/api/health").json()
        self.assertEqual(body["status"], "ok")
        self.assertTrue(body["model_available"])

    def test_predict(self):
        r = self.client.post("/api/predict", json={"text": "Operating profit fell sharply and losses widened.", "top_n": 5})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["prediction"], "negative")
        self.assertAlmostEqual(sum(body["probabilities"].values()), 1.0, places=5)
        self.assertLessEqual(len(body["explanation"]), 5)
        self.assertEqual(set(body["explanations_by_class"]), set(core.LABELS))

    def test_predict_rejects_blank_and_oversized(self):
        self.assertEqual(self.client.post("/api/predict", json={"text": "   "}).status_code, 422)
        self.assertEqual(self.client.post("/api/predict", json={"text": "x" * 5001}).status_code, 422)

    def test_batch(self):
        body = self.client.post("/api/predict/batch", json={"texts": ["Revenue grew 25%.", "Shares plunged."]}).json()
        self.assertEqual(body["summary"]["total"], 2)
        self.assertEqual(len(body["results"]), 2)

    def test_file_upload_guesses_column_and_validates(self):
        csv = b"id,headline\n1,Profit rose to a record high\n2,The company cut 500 jobs after losses\n"
        body = self.client.post("/api/predict/file", files={"file": ("in.csv", csv, "text/csv")}).json()
        self.assertEqual(body["column"], "headline")
        self.assertEqual(body["columns"], ["id", "headline"])
        self.assertEqual(body["summary"]["total"], 2)
        bad = self.client.post("/api/predict/file", files={"file": ("in.csv", csv, "text/csv")}, data={"column": "nope"})
        self.assertEqual(bad.status_code, 422)
        wrong_type = self.client.post("/api/predict/file", files={"file": ("in.txt", csv, "text/plain")})
        self.assertEqual(wrong_type.status_code, 415)

    def test_model_info_and_statistics(self):
        info = self.client.get("/api/model-info").json()
        self.assertEqual(info["confusion_matrix"]["labels"], core.LABELS)
        self.assertEqual(len(info["per_class"]), 3)
        stats = self.client.get("/api/statistics").json()
        self.assertEqual(set(stats["top_terms"]), set(core.LABELS))
        self.assertGreater(stats["dataset"]["final_rows"], 0)


if __name__ == "__main__":
    unittest.main()
