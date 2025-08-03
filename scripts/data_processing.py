import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import timedelta


def get_project_root():
    """Returns the project's root directory as a Path object."""
    return Path(__file__).resolve().parent.parent


class NpEncoder(json.JSONEncoder):
    """
    A custom JSON encoder to handle special data types from Numpy and Pandas
    that the default JSON library cannot serialize.
    """

    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super(NpEncoder, self).default(obj)


def calculate_boxplot_stats(series):
    """
    Calculates all required statistics for a box plot from a pandas Series.
    """
    if series.empty:
        return None
    q = np.percentile(series, [5, 25, 50, 75, 95])
    return {
        "q05": q[0],
        "q25": q[1],
        "median": q[2],
        "q75": q[3],
        "q95": q[4],
        "min": series.min(),
        "max": series.max(),
        "mean": series.mean(),
        "count": len(series),
        "scores": series.tolist(),
    }


def main():
    project_root = get_project_root()
    public_data_dir = project_root / "public" / "data"

    print("----- Starting Full Data Pre-Processing -----")

    # ===== 1. Ingest All Data From Sources =====
    print("Step 1: Ingesting all data from sources...")
    try:
        locations_df = pd.read_csv(
            public_data_dir / "locations.csv", dtype={"location": str}
        )
        gt_df = pd.read_csv(
            public_data_dir / "ground-truth/target-hospital-admissions.csv",
            parse_dates=["date"],
            dtype={"location": str},
        )
        thresholds_df = pd.read_csv(
            public_data_dir / "thresholds.csv", dtype={"Location": str}
        )

        # Evaluation Score Data
        wis_df = pd.read_csv(
            public_data_dir / "evaluations-score/WIS_ratio.csv", dtype={"location": str}
        )
        mape_df = pd.read_csv(
            public_data_dir / "evaluations-score/MAPE.csv", dtype={"Location": str}
        )
        coverage_df = pd.read_csv(
            public_data_dir / "evaluations-score/coverage.csv", dtype={"location": str}
        )

        model_names = [
            "MOBS-GLEAM_FLUH",
            "MIGHTE-Nsemble",
            "MIGHTE-Joint",
            "NU_UCSD-GLEAM_AI_FLUH",
            "CEPH-Rtrend_fluH",
            "NEU_ISI-FluBcast",
            "NEU_ISI-AdaptiveEnsemble",
            "FluSight-ensemble",
        ]

        pred_dfs, nowcast_dfs = [], []
        for model in model_names:
            current_path = public_data_dir / f"unprocessed/{model}"
            archive_path = public_data_dir / f"archive/{model}"
            files = list(current_path.glob("*.csv")) + list(archive_path.glob("*.csv"))
            if not files:
                continue

            model_df = pd.concat(
                (pd.read_csv(f, low_memory=False) for f in files), ignore_index=True
            )
            model_df["model"] = model
            pred_dfs.append(model_df)

            # Ingest nowcast trends if they exist for the model
            nowcast_file = public_data_dir / f"processed/{model}/nowcast_trends.csv"
            if nowcast_file.exists():
                nowcast_df = pd.read_csv(nowcast_file, parse_dates=["reference_date"])
                nowcast_df["model"] = model
                nowcast_dfs.append(nowcast_df)

        all_preds_df = pd.concat(pred_dfs, ignore_index=True)
        all_nowcasts_df = (
            pd.concat(nowcast_dfs, ignore_index=True) if nowcast_dfs else pd.DataFrame()
        )

        print(
            f"DEBUG: Initial raw predictions loaded. Shape: {all_preds_df.shape}"
        )
        if not all_nowcasts_df.empty:
            print(
                f"DEBUG: Initial raw nowcasts loaded. Shape: {all_nowcasts_df.shape}"
            )

    except FileNotFoundError as e:
        print(f"FATAL ERROR: A required data file was not found: {e}")
        return

    # ===== 2. Clean & Standardize Predictions =====
    print("Step 2: Cleaning, standardizing, and pivoting prediction data...")
    rename_dict = {
        "forecast_date": "reference_date",
        "type": "output_type",
        "quantile": "output_type_id",
    }
    all_preds_df.rename(columns=rename_dict, inplace=True)
    all_preds_df = all_preds_df[all_preds_df["target"] == "wk_inc_flu_hosp"].copy()

    # Ensure output_type_id is string for pivot, handle potential float values
    all_preds_df["output_type_id"] = all_preds_df["output_type_id"].astype(str)

    all_preds_df = all_preds_df.pivot_table(
        index=["reference_date", "target_end_date", "location", "model"],
        columns="output_type_id",
        values="value",
    ).reset_index()
    # After pivot, column names that were numbers (like '0.5') might become floats. Convert to string for consistency.
    all_preds_df.columns = [str(c) for c in all_preds_df.columns]

    print(f"DEBUG: Predictions pivoted. Shape: {all_preds_df.shape}")

    all_preds_df["reference_date"] = pd.to_datetime(all_preds_df["reference_date"])
    all_preds_df["target_end_date"] = pd.to_datetime(all_preds_df["target_end_date"])
    all_preds_df["horizon"] = (
        (all_preds_df["target_end_date"] - all_preds_df["reference_date"]).dt.days / 7
    ).astype(int)
    all_preds_df = all_preds_df[all_preds_df["horizon"].isin([0, 1, 2, 3])]

    gt_df.rename(
        columns={
            "location": "stateNum",
            "value": "admissions",
            "weekly_rate": "weeklyRate",
        },
        inplace=True,
    )
    gt_df = gt_df[["date", "stateNum", "admissions", "weeklyRate"]]
    gt_df = gt_df.replace("NA", pd.NA).dropna()

    # ===== 3. Fix Ground Truth =====
    print("Step 3: Fixing ground truth data...")
    all_gt_dates, all_pred_dates = (
        gt_df["date"],
        pd.concat([all_preds_df["reference_date"], all_preds_df["target_end_date"]]),
    )
    earliest_date, latest_date = (
        min(all_gt_dates.min(), all_pred_dates.min()),
        max(all_gt_dates.max(), all_pred_dates.max()),
    )
    full_date_range = pd.date_range(start=earliest_date, end=latest_date, freq="W-SAT")

    all_locations = locations_df["location"].unique()
    complete_grid = pd.MultiIndex.from_product(
        [full_date_range, all_locations], names=["date", "stateNum"]
    )
    complete_gt_df = pd.DataFrame(index=complete_grid).reset_index()

    gt_df_fixed = pd.merge(complete_gt_df, gt_df, on=["date", "stateNum"], how="left")
    gt_df_fixed["admissions"].fillna(-1, inplace=True)
    gt_df_fixed["weeklyRate"].fillna(0, inplace=True)
    print(f"DEBUG: Ground truth fixed. Shape: {gt_df_fixed.shape}")
    # --- 4. Generate Seasons ---
    print("Step 4: Generating season definitions...")
    seasons = {}
    current_year = latest_date.year
    if (
        latest_date.month > 7
    ):  # If we are past July, the current season belongs to the next year
        current_year += 1

    season_end = pd.Timestamp(year=current_year, month=7, day=31)
    while season_end >= earliest_date:
        season_start = pd.Timestamp(year=current_year - 1, month=8, day=1)
        season_id = f"season-{current_year - 1}-{current_year}"
        seasons[season_id] = {"start": season_start, "end": season_end}
        current_year -= 1
        season_end = pd.Timestamp(year=current_year, month=7, day=31)

    # Create SeasonOption list for metadata
    season_options = []
    for i, (id, dates) in enumerate(reversed(list(seasons.items()))):
        is_ongoing = latest_date <= dates["end"]
        label = f"{id.split('-')[1]}-{id.split('-')[2]}"
        if is_ongoing:
            label += " (Ongoing)"

        time_value = (
            f"{dates['start'].strftime('%Y-%m-%d')}/{dates['end'].strftime('%Y-%m-%d')}"
        )
        season_options.append(
            {
                "index": i,
                "displayString": label,
                "timeValue": time_value,
                "startDate": dates["start"],
                "endDate": dates["end"],
                "id": id,
            }
        )
    default_season_tv = season_options[
        -1
    ][
        "timeValue"
    ]  # Frontend page's Settings Panel will default to ongoing season using this metadata

    # Add dynamic seasons
    last_valid_ref_date = all_preds_df["reference_date"].max()
    dynamic_seasons = [
        ("last-8-weeks", "Last 8 Weeks", 7),
        ("last-4-weeks", "Last 4 Weeks", 3),
        ("last-2-weeks", "Last 2 Weeks", 1),
    ]
    for id, label, weeks_sub in dynamic_seasons:
        season_options.append(
            {
                "id": id,
                "label": label,
                "isDynamic": True,
                "startDate": last_valid_ref_date - timedelta(weeks=weeks_sub),
                "endDate": last_valid_ref_date,
            }
        )

    # ===== 5. Partition In-Season Data for Performance =====
    print("Step 5: Partitioning time-series data by season...")
    time_series_data = {}

    print("Creating fast lookup indexes for dataframes...")
    gt_df_indexed = gt_df_fixed.set_index(["date", "stateNum"])
    preds_df_indexed = all_preds_df.set_index(["reference_date", "location"])

    for season_id, dates in seasons.items():
        print(f"Processing season: {season_id}")
        season_preds = all_preds_df[
            (all_preds_df["reference_date"] >= dates["start"])
            & (all_preds_df["reference_date"] <= dates["end"])
        ]
        time_series_data[season_id] = {
            "partitions": {
                "pre-forecast": {},
                "full-forecast": {},
                "forecast-tail": {},
                "post-forecast": {},
            }
        }

        if season_preds.empty:
            first_pred_ref_date, last_pred_ref_date, last_pred_target_date = (
                dates["end"],
                dates["start"],
                dates["start"],
            )
        else:
            first_pred_ref_date, last_pred_ref_date, last_pred_target_date = (
                season_preds["reference_date"].min(),
                season_preds["reference_date"].max(),
                season_preds["target_end_date"].max(),
            )
            time_series_data[season_id].update(
                {
                    "firstPredRefDate": first_pred_ref_date,
                    "lastPredRefDate": last_pred_ref_date,
                    "lastPredTargetDate": last_pred_target_date,
                }
            )

        ranges = {
            "pre-forecast": (dates["start"], first_pred_ref_date - timedelta(days=1)),
            "full-forecast": (first_pred_ref_date, last_pred_ref_date),
            "forecast-tail": (
                last_pred_ref_date + timedelta(days=1),
                last_pred_target_date,
            ),
            "post-forecast": (last_pred_target_date + timedelta(days=1), dates["end"]),
        }

        for part_name, (start_d, end_d) in ranges.items():
            if start_d > end_d:
                continue

            part_data = {}
            gt_dates_in_part = gt_df_fixed.loc[
                (gt_df_fixed["date"] >= start_d) & (gt_df_fixed["date"] <= end_d),
                "date",
            ]
            pred_dates_in_part = all_preds_df.loc[
                (all_preds_df["reference_date"] >= start_d)
                & (all_preds_df["reference_date"] <= end_d),
                "reference_date",
            ]
            all_unique_dates_in_part = pd.concat(
                [gt_dates_in_part, pred_dates_in_part]
            ).unique()

            for state_num in all_locations:
                part_data[state_num] = {}
                for ref_date in all_unique_dates_in_part:
                    if not (start_d <= pd.to_datetime(ref_date) <= end_d):
                        continue

                    ref_date_iso, entry = (
                        pd.to_datetime(ref_date).strftime("%Y-%m-%d"),
                        {},
                    )

                    try:
                        gt_row = gt_df_indexed.loc[(ref_date, state_num)]
                        if pd.notna(gt_row["admissions"]) and gt_row["admissions"] >= 0:
                            entry["groundTruth"] = {
                                "admissions": gt_row["admissions"],
                                "weeklyRate": gt_row["weeklyRate"],
                            }
                    except KeyError:
                        pass

                    try:
                        preds_on_date = preds_df_indexed.loc[(ref_date, state_num)]
                        if not preds_on_date.empty:
                            predictions_dict = {}
                            # Handle both single (Series) and multiple (DataFrame) predictions, for safety
                            if isinstance(preds_on_date, pd.Series):
                                preds_on_date = preds_on_date.to_frame().T
                            for _, pred_row in preds_on_date.iterrows():
                                target_date_iso = pred_row["target_end_date"].strftime(
                                    "%Y-%m-%d"
                                )
                                model = pred_row["model"]
                                if target_date_iso not in predictions_dict:
                                    predictions_dict[target_date_iso] = {}
                                predictions_dict[target_date_iso][model] = {
                                    "horizon": pred_row["horizon"],
                                    "median": pred_row[0.5],
                                    "q25": pred_row[0.25],
                                    "q75": pred_row[0.75],
                                    "q05": pred_row[0.025],
                                    "q95": pred_row[0.95],
                                }
                            entry["predictions"] = predictions_dict
                    except KeyError:
                        pass

                    if entry:
                        part_data[state_num][ref_date_iso] = entry
            time_series_data[season_id]["partitions"][part_name] = part_data

    # DEBUG: Print a sample of the final nested structure
    print("DEBUG: Sample of final nested time_series_data for one state:")
    try:
        sample_data = time_series_data["season-2023-2024"]["partitions"][
            "full-forecast"
        ]["06"]["2024-03-09"]
        print(json.dumps(sample_data, indent=2, cls=NpEncoder))
    except KeyError:
        print(
            "DEBUG: Error in acquiring sample time-series data using nested structure. Check the implementation."
        )

    # ===== 6. Aggregate Evaluation Data =====
    print("Step 6: Pre-aggregating evaluation data...")
    # Clean and standardize all three evaluation dataframes
    wis_df["metric"] = "WIS/Baseline"
    wis_df.rename(
        columns={"Model": "model", "wis_ratio": "score", "location": "stateNum"},
        inplace=True,
    )

    mape_df["metric"] = "MAPE"
    mape_df.rename(
        columns={"Model": "model", "MAPE": "score", "Location": "stateNum"},
        inplace=True,
    )
    mape_df["score"] *= 100

    coverage_df.rename(columns={"Model": "model", "location": "stateNum"}, inplace=True)
    coverage_long_df = coverage_df.melt(
        id_vars=["reference_date", "model", "stateNum", "horizon"],
        value_vars=[
            f"{cov}_cov" for cov in [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98]
        ],
        var_name="coverage_level",
        value_name="score",
    )
    coverage_long_df["coverage_level"] = (
        coverage_long_df["coverage_level"].str.replace("_cov", "").astype(int)
    )
    coverage_long_df["score"] *= 100

    coverage_scores_df = coverage_df[
        ["reference_date", "model", "stateNum", "horizon"]
    ].copy()
    coverage_scores_df["metric"] = "Coverage"
    coverage_scores_df["score"] = coverage_df["95_cov"] * 100

    eval_scores_df = pd.concat([wis_df, mape_df, coverage_scores_df], ignore_index=True)
    for df in [eval_scores_df, coverage_long_df]:
        df["reference_date"] = pd.to_datetime(df["reference_date"])
        df["stateNum"] = df["stateNum"].astype(str).str.zfill(2)

    # Assign season ID to each score entry
    def get_season_id(date):
        for season_id, s_dates in seasons.items():
            if s_dates["start"] <= date <= s_dates["end"]:
                return season_id
        return None

    eval_scores_df["seasonId"] = eval_scores_df["reference_date"].apply(get_season_id)
    coverage_long_df["seasonId"] = coverage_long_df["reference_date"].apply(
        get_season_id
    )
    eval_scores_df.dropna(subset=["seasonId"], inplace=True)
    coverage_long_df.dropna(subset=["seasonId"], inplace=True)
    print(
        f"DEBUG: Evaluation scores assigned to seasons. Shape: {eval_scores_df.shape}"
    )

    # Perform aggregations
    iqr_data, state_map_data, coverage_data = {}, {}, {}

    # Box Plot Aggregations
    grouped_iqr = eval_scores_df.groupby(["seasonId", "metric", "model", "horizon"])[
        "score"
    ]
    for (season, metric, model, horizon), group in grouped_iqr:
        stats = calculate_boxplot_stats(group)
        if stats:
            iqr_data.setdefault(season, {}).setdefault(metric, {}).setdefault(
                model, {}
            )[horizon] = stats

    # State Map Aggregations
    state_map_agg = (
        eval_scores_df.groupby(["seasonId", "metric", "model", "stateNum", "horizon"])[
            "score"
        ]
        .agg(["sum", "count"])
        .reset_index()
    )
    for _, row in state_map_agg.iterrows():
        state_map_data.setdefault(row["seasonId"], {}).setdefault(
            row["metric"], {}
        ).setdefault(row["model"], {}).setdefault(row["stateNum"], {})[
            row["horizon"]
        ] = {"sum": row["sum"], "count": int(row["count"])}

    # PI Chart Aggregations
    coverage_agg = (
        coverage_long_df.groupby(["seasonId", "model", "horizon", "coverage_level"])[
            "score"
        ]
        .agg(["sum", "count"])
        .reset_index()
    )
    for _, row in coverage_agg.iterrows():
        coverage_data.setdefault(row["seasonId"], {}).setdefault(
            row["model"], {}
        ).setdefault(row["horizon"], {})[int(row["coverage_level"])] = {
            "sum": row["sum"],
            "count": int(row["count"]),
        }

    print("Aggregations for all evaluation charts are complete.")

    # ===== 7. Compile and Output JSONs =====
    print("Step 7: Compiling and writing final JSON files...")

    # Process thresholds data for core JSON
    thresholds_df.rename(columns={"Location": "stateNum"}, inplace=True)
    thresholds_dict = thresholds_df.set_index("stateNum").to_dict(orient="index")

    # Process nowcast trends data for core JSON
    nowcast_dict = {}
    if not all_nowcasts_df.empty:
        for _, row in all_nowcasts_df.iterrows():
            model, date_iso, loc = (
                row["model"],
                row["reference_date"].strftime("%Y-%m-%d"),
                row["location"],
            )
            nowcast_dict.setdefault(model, {}).setdefault(date_iso, {})[loc] = {
                "decrease": row["decrease"],
                "increase": row["increase"],
                "stable": row["stable"],
            }

    # Assemble app_data_core.json
    app_data_core_json = {
        "metadata": {
            "seasons": season_options,
            "modelNames": model_names,
            "defaultSeasonTimeValue": default_season_tv,
        },
        "mainData": {
            "locations": locations_df.to_dict(orient="records"),
            "thresholds": thresholds_dict,
            "nowcastTrends": nowcast_dict,
            "timeSeriesData": time_series_data,
        },
    }

    # Assemble app_data_evaluations.json
    app_data_evaluations_json = {
        "precalculated": {
            "iqr": iqr_data,
            "stateMap_aggregates": state_map_data,
            "detailedCoverage_aggregates": coverage_data,
        }
    }

    # Write files to disk
    core_output_path = public_data_dir / "app_data_core.json"
    eval_output_path = public_data_dir / "app_data_evaluations.json"

    with open(core_output_path, "w") as f:
        json.dump(app_data_core_json, f, cls=NpEncoder)
    print(
        f"Successfully wrote app_data_core.json ({core_output_path.stat().st_size / 1e6:.2f} MB)"
    )

    with open(eval_output_path, "w") as f:
        json.dump(app_data_evaluations_json, f, cls=NpEncoder)
    print(
        f"Successfully wrote app_data_evaluations.json ({eval_output_path.stat().st_size / 1e6:.2f} MB)"
    )

    print("--- Pre-processing complete. ---")


if __name__ == "__main__":
    main()
