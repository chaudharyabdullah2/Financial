# Polarity — Financial Sentiment Analysis

This repository includes a Streamlit interface for the saved financial sentiment classifier, the original shared model logic, the saved model, dataset, reports, FastAPI API source, and the Next.js frontend source.

## Deploy the Streamlit app

1. Push the repository contents to GitHub.
2. In Streamlit Community Cloud, choose repository `financial-sentiment`, branch `main`.
3. Set **Main file path** to `app.py` (not `api/main.py` and not `predict.py`).
4. Deploy. Keep these root-level paths in the repository:
   - `app.py`
   - `sentiment_core.py`
   - `requirements.txt`
   - `models/sentiment_model.joblib`
   - `models/metadata.json`
   - `data/financial_sentiment.csv` (optional for prediction, used for dataset metrics)
   - `reports/` (optional model reports)

The app includes single-text analysis, class probabilities, term explanations, CSV batch analysis/download, and model/dataset information.

## Run locally

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

## Run the FastAPI backend separately (optional)

From the repository root:

```bash
uvicorn api.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs`. The Streamlit app does not require the API server; it loads the model directly.

## Model notes

The saved model was trained with scikit-learn 1.9.0, so the requirements pin that version to avoid model-persistence version mismatches. Recorded evaluation metrics are estimates on the project's saved test split and are not a guarantee of live financial-market performance. This app is informational and not financial advice.
