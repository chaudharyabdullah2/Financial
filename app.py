"""Polarity — Financial Sentiment Analysis Streamlit application.

Deploy on Streamlit Community Cloud with Main file path: app.py.
Keep sentiment_core.py and the models/ directory in the repository root.
"""
from __future__ import annotations

import io
import sys
import time
import warnings
from pathlib import Path

import pandas as pd
import streamlit as st

# Ensure the repository root is importable even when Streamlit launches from
# a different working directory.
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import sentiment_core as core  # noqa: E402

warnings.filterwarnings("ignore", category=FutureWarning)

st.set_page_config(
    page_title="Polarity | Financial Sentiment",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ----------------------------- Styling ------------------------------------
st.markdown(
    """
    <style>
    :root { --polarity-ink: #101828; --polarity-muted: #667085; }
    .stApp { background: #f6f8fc; }
    [data-testid="stHeader"] { background: rgba(246,248,252,.92); }
    .block-container { padding-top: 1.7rem; padding-bottom: 3rem; max-width: 1250px; }
    .hero {
      background: linear-gradient(120deg, #101828 0%, #182b4d 58%, #245c78 100%);
      padding: 1.7rem 2rem; border-radius: 20px; color: white; margin-bottom: 1.3rem;
      box-shadow: 0 12px 35px rgba(16,24,40,.12);
    }
    .hero h1 { color: white; margin: 0; font-size: 2.25rem; letter-spacing: -.04em; }
    .hero p { color: #dbe7f4; margin: .5rem 0 0 0; font-size: 1rem; }
    .metric-card {
      border: 1px solid #e4eaf2; background: white; padding: 1rem 1.1rem;
      border-radius: 15px; min-height: 105px; box-shadow: 0 3px 12px rgba(16,24,40,.035);
    }
    .metric-label { color: #667085; font-size: .82rem; margin-bottom: .4rem; }
    .metric-value { color: #101828; font-weight: 750; font-size: 1.5rem; }
    .subtle { color: #667085; font-size: .88rem; }
    div[data-testid="stTabs"] button { font-weight: 650; }
    div.stButton > button[kind="primary"] { border-radius: 10px; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ----------------------------- Model/data ---------------------------------
@st.cache_resource(show_spinner="Loading the financial sentiment model...")
def get_model():
    if not Path(core.MODEL_PATH).exists():
        raise FileNotFoundError(
            f"Model file not found: {core.MODEL_PATH}. Ensure models/sentiment_model.joblib is committed to GitHub."
        )
    return core.load_model(core.MODEL_PATH)


@st.cache_data(show_spinner=False)
def get_dataset_summary():
    if not Path(core.DATA_PATH).exists():
        return None, None
    df, stats = core.load_dataset(core.DATA_PATH)
    return stats, df


def pct(value):
    return f"{float(value) * 100:.1f}%"


def prediction_color(label):
    return {"positive": "#067647", "neutral": "#475467", "negative": "#b42318"}.get(label, "#101828")


def metric_card(label, value, caption=""):
    st.markdown(
        f'<div class="metric-card"><div class="metric-label">{label}</div>'
        f'<div class="metric-value">{value}</div><div class="subtle">{caption}</div></div>',
        unsafe_allow_html=True,
    )


def infer_one(model, text, top_n):
    started = time.perf_counter()
    result = core.analyze(model, text, top_n=top_n)
    result["latency_ms"] = (time.perf_counter() - started) * 1000
    return result


# ----------------------------- Header -------------------------------------
st.markdown(
    """
    <div class="hero">
      <h1>Polarity</h1>
      <p>Financial sentiment intelligence · Classify market news, company updates, and investor commentary.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

try:
    model = get_model()
except Exception as exc:
    st.error("The sentiment model could not be loaded.")
    st.exception(exc)
    st.stop()

metadata = core.load_metadata()
dataset_stats, dataset_df = get_dataset_summary()

with st.sidebar:
    st.markdown("## Polarity")
    st.caption("Financial sentiment analysis")
    st.divider()
    page = st.radio(
        "Workspace",
        ["Analyze text", "Batch CSV", "Model & dataset"],
        label_visibility="collapsed",
    )
    st.divider()
    st.markdown("**Model status**")
    st.success("Model loaded")
    st.caption(f"Model: {metadata.get('best_model', 'Saved classifier')}")
    st.caption("Labels: Negative · Neutral · Positive")
    st.divider()
    st.caption("Predictions are model estimates, not financial advice.")

if page == "Analyze text":
    st.subheader("Analyze a financial statement")
    st.write("Paste a headline, earnings update, market comment, or company announcement.")
    examples = [
        "The company reported record revenue and raised its full-year profit outlook.",
        "Shares plunged after management cut its earnings forecast.",
        "The board will hold its annual general meeting next month.",
    ]
    selected_example = st.selectbox("Try a sample", ["Write or paste your own text"] + examples)
    default_text = "" if selected_example == "Write or paste your own text" else selected_example
    text_input = st.text_area(
        "Text to analyze",
        value=default_text,
        height=150,
        max_chars=5000,
        placeholder="Example: The company beat earnings expectations and raised its revenue guidance...",
    )
    left, right = st.columns([1, 1])
    with left:
        top_n = st.slider("Explanation terms", min_value=3, max_value=15, value=8)
    with right:
        st.markdown("<div style='height:1.85rem'></div>", unsafe_allow_html=True)
        run = st.button("Analyze sentiment", type="primary", use_container_width=True)

    if run:
        if not text_input.strip():
            st.warning("Enter some text before running the analysis.")
        else:
            with st.spinner("Analyzing text..."):
                try:
                    result = infer_one(model, text_input, top_n)
                except Exception as exc:
                    st.error(f"Analysis failed: {exc}")
                    st.stop()

            label = result["prediction"]
            c1, c2, c3, c4 = st.columns(4)
            with c1:
                metric_card("Predicted sentiment", label.title(), "Three-class classifier")
            with c2:
                metric_card("Confidence", pct(result["confidence"]), "Highest class probability")
            with c3:
                metric_card("Recognized terms", str(result.get("known_terms", 0)), "Known word features")
            with c4:
                metric_card("Processing time", f"{result['latency_ms']:.1f} ms", "Local model inference")

            st.markdown(
                f"<div style='margin:1.2rem 0 .5rem;color:{prediction_color(label)};font-weight:750;font-size:1.1rem'>"
                f"{label.upper()} SENTIMENT</div>",
                unsafe_allow_html=True,
            )
            st.subheader("Class probabilities")
            probs = result.get("probabilities", {})
            for class_name in core.LABELS:
                value = float(probs.get(class_name, 0))
                st.markdown(f"**{class_name.title()}** · {pct(value)}")
                st.progress(max(0.0, min(1.0, value)))

            st.subheader("Terms supporting the prediction")
            explanation = result.get("explanation", [])
            if explanation:
                exp_df = pd.DataFrame(explanation, columns=["Term / phrase", "Contribution"])
                exp_df["Contribution"] = exp_df["Contribution"].round(4)
                st.dataframe(exp_df, use_container_width=True, hide_index=True)
            else:
                st.info("The model did not find readable word features that strongly support this prediction.")

            with st.expander("View cleaned text and all class explanations"):
                st.write("**Cleaned text**")
                st.code(result.get("cleaned_text", ""))
                for class_name, terms in result.get("explanations_by_class", {}).items():
                    st.markdown(f"**{class_name.title()}**")
                    if terms:
                        st.write(", ".join(f"{term} ({weight:.3f})" for term, weight in terms))
                    else:
                        st.caption("No strong readable terms found.")

elif page == "Batch CSV":
    st.subheader("Batch sentiment analysis")
    st.write("Upload a CSV containing financial headlines, news, or comments. Results can be downloaded as a CSV.")
    uploaded = st.file_uploader("Upload CSV file", type=["csv"])
    if uploaded is not None:
        try:
            raw = uploaded.getvalue()
            if len(raw) > 10 * 1024 * 1024:
                st.error("The file exceeds 10 MB. Please upload a smaller CSV.")
                st.stop()
            try:
                df = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(raw), encoding="latin-1")
            if df.empty:
                st.warning("The CSV has no data rows.")
                st.stop()
            df.columns = [str(c) for c in df.columns]
            candidate_columns = list(df.columns)
            preferred = next((c for c in candidate_columns if c.lower() in {"text", "sentence", "headline", "title", "content"}), candidate_columns[0])
            chosen_col = st.selectbox("Column containing text", candidate_columns, index=candidate_columns.index(preferred))
            max_rows = min(len(df), 50000)
            st.caption(f"{len(df):,} rows found. Up to {max_rows:,} rows will be analyzed.")
            st.dataframe(df.head(5), use_container_width=True)
            if st.button("Analyze CSV", type="primary"):
                texts = df[chosen_col].head(max_rows).fillna("").astype(str).tolist()
                with st.spinner(f"Analyzing {len(texts):,} rows..."):
                    preds = core.predict(model, texts)
                output = df.head(max_rows).copy()
                output["predicted_sentiment"] = preds["prediction"].values
                output["confidence"] = preds["confidence"].values
                for class_name in core.LABELS:
                    col = f"probability_{class_name}"
                    source_col = f"p_{class_name}"
                    if source_col in preds:
                        output[col] = preds[source_col].values
                counts = preds["prediction"].value_counts().reindex(core.LABELS, fill_value=0)
                a, b, c, d = st.columns(4)
                with a:
                    metric_card("Rows analyzed", f"{len(output):,}")
                with b:
                    metric_card("Positive", f"{int(counts['positive']):,}")
                with c:
                    metric_card("Neutral", f"{int(counts['neutral']):,}")
                with d:
                    metric_card("Negative", f"{int(counts['negative']):,}")
                st.dataframe(output.head(100), use_container_width=True, hide_index=True)
                st.download_button(
                    "Download predictions CSV",
                    data=output.to_csv(index=False).encode("utf-8-sig"),
                    file_name="financial_sentiment_predictions.csv",
                    mime="text/csv",
                    type="primary",
                )
                st.session_state["last_batch_summary"] = {
                    "rows": len(output),
                    "counts": {k: int(v) for k, v in counts.items()},
                }
        except Exception as exc:
            st.error(f"Could not process this CSV: {exc}")

else:
    st.subheader("Model & dataset")
    st.write("Details about the saved classifier and the dataset bundled with this project.")
    a, b, c, d = st.columns(4)
    with a:
        metric_card("Classifier", str(metadata.get("best_model", "Unknown")))
    with b:
        metric_card("Test accuracy", pct(metadata.get("test_accuracy", 0)), "Reported training evaluation")
    with c:
        metric_card("Test macro F1", pct(metadata.get("test_macro_f1", 0)), "Reported training evaluation")
    with d:
        metric_card("Training rows", f"{metadata.get('train_size', '—'):,}" if isinstance(metadata.get("train_size"), (int, float)) else "—")

    st.markdown("### Saved model metadata")
    st.json(metadata)
    if dataset_stats:
        st.markdown("### Dataset summary")
        metric_columns = st.columns(4)
        summary_items = [
            ("Raw rows", dataset_stats.get("raw_rows", 0)),
            ("Valid rows", dataset_stats.get("valid_rows", 0)),
            ("Final rows", dataset_stats.get("final_rows", 0)),
            ("Conflicts resolved", dataset_stats.get("conflicts_resolved", 0)),
        ]
        for col, (label, value) in zip(metric_columns, summary_items):
            with col:
                metric_card(label, f"{value:,}")
        if dataset_stats.get("class_counts"):
            st.markdown("### Class distribution")
            class_df = pd.DataFrame(
                [{"Sentiment": k.title(), "Rows": v} for k, v in dataset_stats["class_counts"].items()]
            )
            st.bar_chart(class_df.set_index("Sentiment"))
    else:
        st.info("Dataset CSV is not present. Text prediction still works with the saved model.")
    report_path = PROJECT_ROOT / "reports" / "classification_report.json"
    if report_path.exists():
        st.markdown("### Classification report")
        try:
            st.json(pd.read_json(report_path, typ="series").to_dict())
        except Exception:
            st.caption("A classification report is available in the reports folder.")
    st.caption("Evaluation metrics reflect the saved model's recorded test split. Real-world performance may differ.")
