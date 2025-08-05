import sys
import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import timedelta


# ========================
# === HELPER FUNCTIONS ===
# ========================


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
    
    # Remove NaN values to avoid numpy warnings
    clean_series = series.dropna()
    if clean_series.empty:
        return None
        
    q = np.percentile(clean_series, [5, 25, 50, 75, 95])
    return {
        "q05": q[0],
        "q25": q[1],
        "median": q[2],
        "q75": q[3],
        "q95": q[4],
        "min": clean_series.min(),
        "max": clean_series.max(),
        "mean": clean_series.mean(),
        "count": len(clean_series),
        "scores": clean_series.tolist(),
    }


# ==================================
# ======== MAIN PROCESSING =========
# ==================================
def main():
    project_root = get_project_root()
    public_data_dir = project_root / "public" / "data"
    print("----- Starting Full Data Pre-Processing -----")

    # ===== 1. Get All Data From Sources =====
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

        # ====== NOTE on Prediction, Archive Prediction, and Nowcast Generation =====
        # New Prediction vs Archive Prediction contain different header formats & nowcast is extracted from new ones ONLY
        # So we load, generate nowcast from new, parse them, change headers and combine back together, THEN move onto next step

        # 1a. Retrieve "unprocessed" (new format) files
        unprocessed_dfs = []
        for model in model_names:
            path = public_data_dir / f"unprocessed/{model}"
            files = list(path.glob("*.csv"))
            if not files:
                continue
            df = pd.concat(
                (pd.read_csv(f, low_memory=False, dtype={"location": str}) for f in files), ignore_index=True
            )
            df["model"] = model
            unprocessed_dfs.append(df)
        unprocessed_df = (
            pd.concat(unprocessed_dfs, ignore_index=True)
            if unprocessed_dfs
            else pd.DataFrame()
        )

        # 1b. Retrieve "archive" (old format) files
        archive_dfs = []
        for model in model_names:
            path = public_data_dir / f"archive/{model}"
            files = list(path.glob("*.csv"))
            if not files:
                continue
            df = pd.concat(
                (pd.read_csv(f, low_memory=False, dtype={"location": str}) for f in files), ignore_index=True
            )
            df["model"] = model
            archive_dfs.append(df)
        archive_df = (
            pd.concat(archive_dfs, ignore_index=True) if archive_dfs else pd.DataFrame()
        )

        print(
            f"   - DEBUG: Loaded {len(unprocessed_df)} rows from 'unprocessed' files."
        )
        print(f"   - DEBUG: Loaded {len(archive_df)} rows from 'archive' files.")

    except FileNotFoundError as e:
        print(f"FATAL ERROR: A required data file was not found: {e}")
        return

    # ===== 2. EXTRACT NOWCASTS & CLEAN PREDICTIONS =====
    print("Step 2: Processing data by source type...")

    # --- A) Process Nowcast Trends from UNPROCESSED data ONLY ---
    print("   - Extracting and processing nowcast trends...")
    all_nowcasts_df = pd.DataFrame()
    if not unprocessed_df.empty:
        """ Nowcast Models: Only those model predictions that contain `wk flu hosp rate change` as target """
        # TODO: Write a helper function to automatically find which model predictions in `unprocessed/` satisfies this criteria, then use that namelist?
        nowcast_models = [
            "MOBS-GLEAM_FLUH",
            "MIGHTE-Nsemble",
            "CEPH-Rtrend_fluH",
            "FluSight-ensemble",
            "NU_UCSD-GLEAM_AI_FLUH",
            "MIGHTE-Joint"
        ]
        # Nowcast: Use correct target string with spaces instead of underscores
        trends_df = unprocessed_df[
            (unprocessed_df["target"] == "wk flu hosp rate change")
            & (unprocessed_df["model"].isin(nowcast_models))
        ].copy()

        if not trends_df.empty:
            trends_df["reference_date"] = pd.to_datetime(trends_df["reference_date"])
            trends_df["target_end_date"] = pd.to_datetime(trends_df["target_end_date"])
            trends_df = trends_df[
                trends_df["target_end_date"] == trends_df["reference_date"]
            ].copy()
            trends_df["output_type_id"] = trends_df["output_type_id"].str.removeprefix(
                "large_"
            )

            all_nowcasts_df = trends_df.pivot_table(
                index=["reference_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()
            for col in ["stable", "increase", "decrease"]:
                if col not in all_nowcasts_df.columns:
                    all_nowcasts_df[col] = 0.0
            all_nowcasts_df = all_nowcasts_df.fillna(0)
            print(
                f"   - DEBUG: Processed nowcast trends. Shape: {all_nowcasts_df.shape}"
            )
        else:
            print(
                "   - INFO: No nowcast data ('wk flu hosp rate change') found in source files."
            )

    # --- B) Process UNPROCESSED Hospitalization Predictions ---
    processed_unprocessed_preds_df = pd.DataFrame()
    if not unprocessed_df.empty:
        df = unprocessed_df[unprocessed_df["target"] == "wk inc flu hosp"].copy()
        df["output_type_id"] = df["output_type_id"].astype(str)
        desired_quantiles = ["0.025", "0.05", "0.25", "0.5", "0.75", "0.95", "0.975"]
        df = df[df["output_type_id"].isin(desired_quantiles)]
        
        if not df.empty:
            processed_unprocessed_preds_df = df.pivot_table(
                index=["reference_date", "target_end_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()
            # Fix: Ensure column names are strings
            processed_unprocessed_preds_df.columns = [str(c) for c in processed_unprocessed_preds_df.columns]

    # --- C) Process ARCHIVE Hospitalization Predictions ---
    processed_archive_preds_df = pd.DataFrame()
    if not archive_df.empty:
        df = archive_df.copy()
        df.columns = df.columns.str.strip().str.strip('"')
        df.rename(
            columns={
                "forecast_date": "reference_date",
                "type": "output_type",
                "quantile": "output_type_id",
            },
            inplace=True,
        )
        # Archive data might have different target strings
        df = df[df["target"].str.contains("inc flu hosp", na=False)].copy()
        df["output_type_id"] = df["output_type_id"].astype(str)
        desired_quantiles = ["0.025", "0.05", "0.25", "0.5", "0.75", "0.95", "0.975"]
        df = df[df["output_type_id"].isin(desired_quantiles)]
        
        if not df.empty:
            processed_archive_preds_df = df.pivot_table(
                index=["reference_date", "target_end_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()
            # Fix: Ensure column names are strings
            processed_archive_preds_df.columns = [str(c) for c in processed_archive_preds_df.columns]

    # --- D) Combine the prediction dataframes back together ---
    all_preds_df = pd.concat(
        [processed_unprocessed_preds_df, processed_archive_preds_df], ignore_index=True
    )
    
    print(
        f"   - DEBUG: Final combined and pivoted predictions. Shape: {all_preds_df.shape}"
    )

    if all_preds_df.empty:
        print(
            "FATAL ERROR: No valid hospitalization prediction data found after processing."
        )
        return

    # --- E) Final Processing for Predictions and Ground Truth ---
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
    gt_df = gt_df[["date", "stateNum", "admissions", "weeklyRate"]].copy()
    gt_df.dropna(subset=["admissions"], inplace=True)

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
    print(f"    -  DEBUG: Ground truth fixed. Shape: {gt_df_fixed.shape}")
    
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
    # Fix: Sort indexes to avoid performance warnings
    gt_df_indexed = gt_df_fixed.set_index(["date", "stateNum"]).sort_index()
    preds_df_indexed = all_preds_df.set_index(["reference_date", "location", "model"]).sort_index()

    for season_id, dates in seasons.items():
        print(f"Processing season: {season_id}")
        season_preds = all_preds_df[
            (all_preds_df["reference_date"] >= dates["start"])
            & (all_preds_df["reference_date"] <= dates["end"])
        ]
        
        # Fix: Initialize correct structure according to data contract
        time_series_data[season_id] = {}
        
        # Process each model separately
        for model_name in model_names:
            model_preds = season_preds[season_preds["model"] == model_name]
            
            if model_preds.empty:
                first_pred_ref_date, last_pred_ref_date, last_pred_target_date = (
                    dates["end"],
                    dates["start"],
                    dates["start"],
                )
            else:
                first_pred_ref_date, last_pred_ref_date, last_pred_target_date = (
                    model_preds["reference_date"].min(),
                    model_preds["reference_date"].max(),
                    model_preds["target_end_date"].max(),
                )

            time_series_data[season_id][model_name] = {
                "firstPredRefDate": first_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(first_pred_ref_date) else None,
                "lastPredRefDate": last_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(last_pred_ref_date) else None,
                "lastPredTargetDate": last_pred_target_date.strftime("%Y-%m-%d") if pd.notna(last_pred_target_date) else None,
                "partitions": {
                    "pre-forecast": {},
                    "full-forecast": {},
                    "forecast-tail": {},
                    "post-forecast": {},
                }
            }

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
                if pd.isna(start_d) or pd.isna(end_d) or start_d > end_d:
                    continue

                part_data = {}
                gt_dates_in_part = gt_df_fixed.loc[
                    (gt_df_fixed["date"] >= start_d) & (gt_df_fixed["date"] <= end_d),
                    "date",
                ]
                pred_dates_in_part = model_preds.loc[
                    (model_preds["reference_date"] >= start_d)
                    & (model_preds["reference_date"] <= end_d),
                    "reference_date",
                ]
                all_unique_dates_in_part = pd.concat(
                    [gt_dates_in_part, pred_dates_in_part]
                ).unique()

                for ref_date in all_unique_dates_in_part:
                    if not (start_d <= pd.to_datetime(ref_date) <= end_d):
                        continue

                    ref_date_iso = pd.to_datetime(ref_date).strftime("%Y-%m-%d")
                    
                    if ref_date_iso not in part_data:
                        part_data[ref_date_iso] = {}

                    for state_num in all_locations:
                        if state_num not in part_data[ref_date_iso]:
                            part_data[ref_date_iso][state_num] = {}

                        entry = part_data[ref_date_iso][state_num]

                        # Add ground truth data
                        try:
                            gt_row = gt_df_indexed.loc[(ref_date, state_num)]
                            if pd.notna(gt_row["admissions"]) and gt_row["admissions"] >= 0:
                                entry["groundTruth"] = {
                                    "admissions": float(gt_row["admissions"]),
                                    "weeklyRate": float(gt_row["weeklyRate"]),
                                }
                        except KeyError:
                            pass

                        # Add prediction data for this specific model
                        try:
                            preds_on_date = preds_df_indexed.loc[(ref_date, state_num, model_name)]
                            if not preds_on_date.empty:
                                predictions_dict = {}
                                # Handle both single (Series) and multiple (DataFrame) predictions
                                if isinstance(preds_on_date, pd.Series):
                                    preds_on_date = preds_on_date.to_frame().T
                                
                                for _, pred_row in preds_on_date.iterrows():
                                    target_date_iso = pred_row["target_end_date"].strftime("%Y-%m-%d")
                                    predictions_dict[target_date_iso] = {
                                        "horizon": int(pred_row["horizon"]),
                                        "median": float(pred_row["0.5"]) if pd.notna(pred_row["0.5"]) else 0.0,
                                        "q25": float(pred_row["0.25"]) if pd.notna(pred_row["0.25"]) else 0.0,
                                        "q75": float(pred_row["0.75"]) if pd.notna(pred_row["0.75"]) else 0.0,
                                        "q05": float(pred_row["0.025"]) if pd.notna(pred_row["0.025"]) else 0.0,
                                        "q95": float(pred_row["0.95"]) if pd.notna(pred_row["0.95"]) else 0.0,
                                    }
                                if predictions_dict:
                                    entry["predictions"] = predictions_dict
                        except KeyError:
                            pass

                time_series_data[season_id][model_name]["partitions"][part_name] = part_data

    # DEBUG: Print a sample of the final nested structure
    print("    -  DEBUG: Sample of final nested time_series_data for one state:")
    try:
        sample_season = list(time_series_data.keys())[0] if time_series_data else None
        if sample_season:
            sample_model = list(time_series_data[sample_season].keys())[0]
            sample_partition = time_series_data[sample_season][sample_model]["partitions"]["full-forecast"]
            sample_date = list(sample_partition.keys())[0] if sample_partition else None
            if sample_date:
                sample_state = list(sample_partition[sample_date].keys())[0]
                print(f"Season: {sample_season}, Model: {sample_model}, Date: {sample_date}, State: {sample_state}")
                print(json.dumps(sample_partition[sample_date][sample_state], indent=2, cls=NpEncoder))
    except (KeyError, IndexError) as e:
        print(f"    -  DEBUG: Could not create sample output: {e}")

    # ===== 6. Aggregate Evaluation Data =====
    print("Step 6: Pre-aggregating evaluation data...")
    # Clean and standardize all three evaluation dataframes
    
    # Filter evaluation data to only include models we care about
    wis_df = wis_df[wis_df["Model"].isin(model_names)].copy()
    mape_df = mape_df[mape_df["Model"].isin(model_names)].copy()
    coverage_df = coverage_df[coverage_df["Model"].isin(model_names)].copy()
    
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
    # Convert MAPE score to a percentage
    mape_df["score"] *= 100

    # Coverage Scores: since PI Chart vs. SeasonOverviewMap uses different calculation on Coverage, we need to handle this both ways.
    coverage_df.rename(columns={"Model": "model", "location": "stateNum"}, inplace=True)

    # PI Chart needs the long format containing different levels
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

    # For the Season Overview Map, we need just 95% coverage scores
    coverage_scores_df = coverage_df[
        ["reference_date", "model", "stateNum", "horizon"]
    ].copy()
    coverage_scores_df["metric"] = "Coverage"
    coverage_scores_df["score"] = coverage_df["95_cov"] * 100

    # Combine all metrics data into a DataFrame except coverage_long_df
    eval_scores_df = pd.concat([wis_df, mape_df, coverage_scores_df], ignore_index=True)
    for df in [eval_scores_df, coverage_long_df]:
        df["reference_date"] = pd.to_datetime(df["reference_date"])
        df["stateNum"] = df["stateNum"].astype(str).str.zfill(2)
    print("    -  DEBUG: All evaluation score files cleaned and standardized.")

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
        f"    -  DEBUG: Evaluation scores assigned to seasons. Shape: {eval_scores_df.shape}"
    )

    # Perform aggregations
    iqr_data, state_map_data, coverage_data = {}, {}, {}

    # For the IQR data in Season Overview Box Plot, group by every filter option possibly chosen by user
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
        ] = {"sum": float(row["sum"]), "count": int(row["count"])}

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
            "sum": float(row["sum"]),
            "count": int(row["count"]),
        }

    print("Aggregations for all evaluation charts are complete.")

    # ===== 7. Compile and Output JSONs =====
    print("Step 7: Compiling and writing final JSON files...")

    # Process thresholds data for core JSON
    thresholds_df.rename(columns={"Location": "stateNum"}, inplace=True)
    thresholds_dict = {}
    for _, row in thresholds_df.iterrows():
        thresholds_dict[row["stateNum"]] = {
            "medium": float(row["Medium"]),
            "high": float(row["High"]),
            "veryHigh": float(row["Very High"])
        }

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
                "decrease": float(row["decrease"]),
                "increase": float(row["increase"]),
                "stable": float(row["stable"]),
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