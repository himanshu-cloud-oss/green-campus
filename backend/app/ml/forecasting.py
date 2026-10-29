"""Machine Learning time-series energy forecasting service for campus consumption."""
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from app.models.models import MonthlyEnergyRecord
from app.services.energy_service import get_month_name


class ForecastingService:
    """
    Production-grade forecasting service implementing Seasonal Naive,
    Ordinary Least Squares Linear Regression with cyclical features,
    and Random Forest Regressor with lag dynamics.
    """

    MIN_REQUIRED_RECORDS: int = 12

    @classmethod
    def check_data_sufficiency(cls, records: List[MonthlyEnergyRecord]) -> Dict[str, Any]:
        """
        Verify if the dataset meets the minimum temporal horizon required for modeling.
        Requires at least 12 complete monthly records.
        """
        count = len(records)
        if count < cls.MIN_REQUIRED_RECORDS:
            return {
                "sufficient": False,
                "record_count": count,
                "min_required": cls.MIN_REQUIRED_RECORDS,
                "reason": (
                    f"Insufficient data for modeling. Found {count} records, "
                    f"minimum required is {cls.MIN_REQUIRED_RECORDS} monthly cycles."
                ),
            }
        return {
            "sufficient": True,
            "record_count": count,
            "min_required": cls.MIN_REQUIRED_RECORDS,
            "reason": f"Sufficient dataset with {count} monthly records.",
        }

    @staticmethod
    def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Compute standard regression performance metrics (RMSE, MAE, MAPE)."""
        y_true = np.array(y_true, dtype=float)
        y_pred = np.array(y_pred, dtype=float)

        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        mae = float(mean_absolute_error(y_true, y_pred))
        
        # Avoid division by zero in MAPE
        non_zero_mask = y_true != 0
        if np.any(non_zero_mask):
            mape = float(np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100.0)
        else:
            mape = 0.0

        return {
            "rmse": round(rmse, 2),
            "mae": round(mae, 2),
            "mape": round(mape, 2),
        }

    @staticmethod
    def chronological_split(
        records: List[MonthlyEnergyRecord], test_size: float = 0.2
    ) -> Tuple[List[MonthlyEnergyRecord], List[MonthlyEnergyRecord]]:
        """Split chronological sequence into train and test sets preserving order."""
        sorted_records = sorted(records, key=lambda r: (r.year, r.month))
        split_idx = int(len(sorted_records) * (1 - test_size))
        # Ensure at least 1 sample in test if length > 1
        split_idx = min(split_idx, len(sorted_records) - 1)
        return sorted_records[:split_idx], sorted_records[split_idx:]

    @classmethod
    def _create_features(
        cls, sorted_records: List[MonthlyEnergyRecord]
    ) -> pd.DataFrame:
        """
        Engineer predictive features:
        - Trend index (t = 0, 1, 2...)
        - Sine & Cosine periodic harmonics for 12-month annual seasonality
        - Quarter indicator (1-4)
        - Lag-1 and Lag-2 autoregressive values
        """
        rows = []
        for i, r in enumerate(sorted_records):
            month_rad = 2 * np.pi * r.month / 12.0
            lag1 = sorted_records[i - 1].total_kwh if i > 0 else r.total_kwh
            lag2 = sorted_records[i - 2].total_kwh if i > 1 else lag1

            rows.append({
                "trend": i,
                "month": r.month,
                "quarter": (r.month - 1) // 3 + 1,
                "sin_month": np.sin(month_rad),
                "cos_month": np.cos(month_rad),
                "lag1": lag1,
                "lag2": lag2,
                "y": r.total_kwh,
            })
        return pd.DataFrame(rows)

    @classmethod
    def _get_future_date_sequence(
        cls, last_year: int, last_month: int, periods_ahead: int
    ) -> List[Tuple[int, int]]:
        """Generate sequence of future (year, month) tuples."""
        future_dates = []
        curr_y = last_year
        curr_m = last_month
        for _ in range(periods_ahead):
            curr_m += 1
            if curr_m > 12:
                curr_m = 1
                curr_y += 1
            future_dates.append((curr_y, curr_m))
        return future_dates

    @classmethod
    def run_seasonal_naive(
        cls, records: List[MonthlyEnergyRecord], periods_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Seasonal Naive Baseline Model.
        Maps the target forecast month to the identical month from the preceding year.
        If identical month is missing, falls back to the most recent month.
        """
        sufficiency = cls.check_data_sufficiency(records)
        if not sufficiency["sufficient"]:
            raise ValueError(sufficiency["reason"])

        sorted_records = sorted(records, key=lambda r: (r.year, r.month))
        train, test = cls.chronological_split(sorted_records, test_size=0.2)

        # Evaluate on test set
        history_map = {r.month: r.total_kwh for r in train}
        test_preds = []
        test_actuals = [r.total_kwh for r in test]
        last_val = train[-1].total_kwh

        for r in test:
            pred = history_map.get(r.month, last_val)
            test_preds.append(pred)

        metrics = cls.evaluate_model(np.array(test_actuals), np.array(test_preds))

        # Generate future forecast
        full_history_map = {r.month: r.total_kwh for r in sorted_records}
        last_rec = sorted_records[-1]
        future_dates = cls._get_future_date_sequence(last_rec.year, last_rec.month, periods_ahead)

        forecast_items = []
        for y, m in future_dates:
            pred_val = full_history_map.get(m, last_rec.total_kwh)
            forecast_items.append({
                "month": m,
                "year": y,
                "label": f"{get_month_name(m)} {y}",
                "predicted_total_kwh": round(pred_val, 2),
                "lower_bound_kwh": round(max(0, pred_val - metrics["rmse"]), 2),
                "upper_bound_kwh": round(pred_val + metrics["rmse"], 2),
            })

        return {
            "model_name": "seasonal_naive",
            "training_period_start": f"{get_month_name(sorted_records[0].month)} {sorted_records[0].year}",
            "training_period_end": f"{get_month_name(last_rec.month)} {last_rec.year}",
            "forecast_period": f"{periods_ahead} months ahead",
            "metrics": metrics,
            "forecast": forecast_items,
        }

    @classmethod
    def run_linear_regression(
        cls, records: List[MonthlyEnergyRecord], periods_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Linear Regression with cyclical harmonics (sin/cos of month) and autoregressive lags.
        """
        sufficiency = cls.check_data_sufficiency(records)
        if not sufficiency["sufficient"]:
            raise ValueError(sufficiency["reason"])

        sorted_records = sorted(records, key=lambda r: (r.year, r.month))
        feature_cols = ["trend", "sin_month", "cos_month", "quarter", "lag1", "lag2"]
        df = cls._create_features(sorted_records)

        split_idx = int(len(df) * 0.8)
        split_idx = min(split_idx, len(df) - 1)
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]

        # Train on train split to compute metrics
        model_eval = LinearRegression()
        model_eval.fit(train_df[feature_cols], train_df["y"])
        test_preds = model_eval.predict(test_df[feature_cols])
        metrics = cls.evaluate_model(test_df["y"].values, test_preds)

        # Refit on all historical data for projection
        model_full = LinearRegression()
        model_full.fit(df[feature_cols], df["y"])

        # Auto-regressive multi-step rollout for future periods
        last_rec = sorted_records[-1]
        future_dates = cls._get_future_date_sequence(last_rec.year, last_rec.month, periods_ahead)

        current_trend = len(df)
        last_lag1 = df.iloc[-1]["y"]
        last_lag2 = df.iloc[-1]["lag1"]

        forecast_items = []
        for y, m in future_dates:
            m_rad = 2 * np.pi * m / 12.0
            x_step = pd.DataFrame([{
                "trend": current_trend,
                "sin_month": np.sin(m_rad),
                "cos_month": np.cos(m_rad),
                "quarter": (m - 1) // 3 + 1,
                "lag1": last_lag1,
                "lag2": last_lag2,
            }])
            pred = float(model_full.predict(x_step[feature_cols])[0])
            pred = max(0.0, pred)  # Energy cannot be negative

            std_err = metrics["rmse"] if metrics["rmse"] > 0 else 5000.0
            forecast_items.append({
                "month": m,
                "year": y,
                "label": f"{get_month_name(m)} {y}",
                "predicted_total_kwh": round(pred, 2),
                "lower_bound_kwh": round(max(0.0, pred - 1.96 * std_err), 2),
                "upper_bound_kwh": round(pred + 1.96 * std_err, 2),
            })

            # Update rolling lags
            last_lag2 = last_lag1
            last_lag1 = pred
            current_trend += 1

        return {
            "model_name": "linear_regression",
            "training_period_start": f"{get_month_name(sorted_records[0].month)} {sorted_records[0].year}",
            "training_period_end": f"{get_month_name(last_rec.month)} {last_rec.year}",
            "forecast_period": f"{periods_ahead} months ahead",
            "metrics": metrics,
            "forecast": forecast_items,
        }

    @classmethod
    def run_random_forest(
        cls, records: List[MonthlyEnergyRecord], periods_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Random Forest Regressor capturing non-linear heatwave spikes and seasonal drops.
        """
        sufficiency = cls.check_data_sufficiency(records)
        if not sufficiency["sufficient"]:
            raise ValueError(sufficiency["reason"])

        sorted_records = sorted(records, key=lambda r: (r.year, r.month))
        feature_cols = ["trend", "sin_month", "cos_month", "quarter", "lag1", "lag2"]
        df = cls._create_features(sorted_records)

        split_idx = int(len(df) * 0.8)
        split_idx = min(split_idx, len(df) - 1)
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]

        rf_eval = RandomForestRegressor(n_estimators=50, random_state=42)
        rf_eval.fit(train_df[feature_cols], train_df["y"])
        test_preds = rf_eval.predict(test_df[feature_cols])
        metrics = cls.evaluate_model(test_df["y"].values, test_preds)

        rf_full = RandomForestRegressor(n_estimators=50, random_state=42)
        rf_full.fit(df[feature_cols], df["y"])

        last_rec = sorted_records[-1]
        future_dates = cls._get_future_date_sequence(last_rec.year, last_rec.month, periods_ahead)

        current_trend = len(df)
        last_lag1 = df.iloc[-1]["y"]
        last_lag2 = df.iloc[-1]["lag1"]

        forecast_items = []
        for y, m in future_dates:
            m_rad = 2 * np.pi * m / 12.0
            x_step = pd.DataFrame([{
                "trend": current_trend,
                "sin_month": np.sin(m_rad),
                "cos_month": np.cos(m_rad),
                "quarter": (m - 1) // 3 + 1,
                "lag1": last_lag1,
                "lag2": last_lag2,
            }])
            pred = float(rf_full.predict(x_step[feature_cols])[0])
            pred = max(0.0, pred)

            std_err = metrics["rmse"] if metrics["rmse"] > 0 else 5000.0
            forecast_items.append({
                "month": m,
                "year": y,
                "label": f"{get_month_name(m)} {y}",
                "predicted_total_kwh": round(pred, 2),
                "lower_bound_kwh": round(max(0.0, pred - 1.96 * std_err), 2),
                "upper_bound_kwh": round(pred + 1.96 * std_err, 2),
            })

            last_lag2 = last_lag1
            last_lag1 = pred
            current_trend += 1

        return {
            "model_name": "random_forest",
            "training_period_start": f"{get_month_name(sorted_records[0].month)} {sorted_records[0].year}",
            "training_period_end": f"{get_month_name(last_rec.month)} {last_rec.year}",
            "forecast_period": f"{periods_ahead} months ahead",
            "metrics": metrics,
            "forecast": forecast_items,
        }
