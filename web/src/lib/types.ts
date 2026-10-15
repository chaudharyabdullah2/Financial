export type Sentiment = "negative" | "neutral" | "positive";
export const SENTIMENTS: Sentiment[] = ["negative", "neutral", "positive"];

export type Term = { term: string; weight: number };
export type Probabilities = Record<Sentiment, number>;

export type Health = {
  status: "ok" | "degraded";
  model_available: boolean;
  model_loaded: boolean;
  model: string | null;
  trained_at: string | null;
  api_version: string;
  uptime_seconds: number;
};

export type Prediction = {
  prediction: Sentiment;
  confidence: number;
  probabilities: Probabilities;
  explanation: Term[];
  explanations_by_class: Record<Sentiment, Term[]>;
  cleaned_text: string;
  known_terms: number;
  latency_ms: number;
  model: string | null;
};

export type BatchRow = {
  text: string;
  prediction: Sentiment;
  confidence: number;
  probabilities: Probabilities;
};

export type BatchSummary = {
  total: number;
  counts: Record<Sentiment, number>;
  mean_confidence: number;
};

export type BatchResponse = {
  results: BatchRow[];
  summary: BatchSummary;
  latency_ms: number;
};

export type FileResponse = BatchResponse & {
  filename: string;
  columns: string[];
  column: string;
  total_rows: number;
  truncated: boolean;
};

export type Example = { label: string; text: string };

export type ModelMetadata = {
  best_model: string;
  best_params: Record<string, number>;
  selection_metric: string;
  cv_macro_f1: number;
  test_accuracy: number;
  test_macro_f1: number;
  test_weighted_f1: number;
  classes: Sentiment[];
  trained_on: string;
  train_size: number;
  test_size: number;
  seed: number;
  cv_folds: number;
  trained_at: string;
  versions: Record<string, string>;
  data: DatasetStats;
};

export type DatasetStats = {
  raw_rows: number;
  valid_rows: number;
  conflicts_resolved: number;
  conflicts_dropped: number;
  final_rows: number;
  class_counts: Record<Sentiment, number>;
};

export type ComparisonRow = {
  model: string;
  cv_macro_f1: number;
  cv_macro_f1_std: number;
  test_accuracy: number;
  test_macro_f1: number;
  test_weighted_f1: number;
  best_params: Record<string, number>;
  train_seconds: number;
};

export type ModelInfo = {
  metadata: ModelMetadata;
  comparison: ComparisonRow[];
  per_class: { label: Sentiment; precision: number; recall: number; f1: number; support: number }[];
  confusion_matrix: { labels: Sentiment[]; counts: number[][]; normalized: number[][] } | null;
  misclassified: { text: string; true: Sentiment; predicted: Sentiment; confidence: number }[];
};

export type Statistics = {
  dataset: DatasetStats;
  avg_words: number;
  median_words: number;
  avg_words_by_class: Record<Sentiment, number>;
  length_histogram: ({ bucket: string } & Record<Sentiment, number>)[];
  top_terms: Record<Sentiment, Term[]>;
};
