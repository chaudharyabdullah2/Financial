"""Command-line predictions.

Examples:
    python predict.py "Profit rose 20% year on year." "Shares fell sharply."
    python predict.py --csv input.csv --column text --out predictions.csv
"""
import argparse
import os
import sys

import pandas as pd

from sentiment_core import MODEL_PATH, load_model, predict


def main():
    parser = argparse.ArgumentParser(description="Predict financial sentiment.")
    parser.add_argument("texts", nargs="*", help="One or more sentences to classify")
    parser.add_argument("--csv", help="CSV file to score instead of positional texts")
    parser.add_argument("--column", default="text", help="Text column in --csv (default: text)")
    parser.add_argument("--out", help="Where to write scored CSV (default: print to stdout)")
    args = parser.parse_args()

    if not os.path.exists(MODEL_PATH):
        sys.exit("Model not found. Run `python train.py` first.")
    if not args.texts and not args.csv:
        parser.error("provide texts or --csv")

    model = load_model()
    if args.csv:
        data = pd.read_csv(args.csv)
        if args.column not in data.columns:
            sys.exit(f"Column '{args.column}' not found. Available: {list(data.columns)}")
        scored = pd.concat([data, predict(model, data[args.column].fillna("").astype(str))], axis=1)
    else:
        scored = pd.concat([pd.DataFrame({"text": args.texts}), predict(model, args.texts)], axis=1)

    if args.out:
        scored.to_csv(args.out, index=False)
        print(f"Wrote {len(scored)} predictions to {args.out}")
    else:
        with pd.option_context("display.max_colwidth", 60, "display.width", 160):
            print(scored.round(3).to_string(index=False))


if __name__ == "__main__":
    main()
