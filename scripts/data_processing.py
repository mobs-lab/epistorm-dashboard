import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import timedelta

# Import new auxiliary data processing functions
from process_auxiliary_data import process_locations, process_thresholds, process_historical_ground_truth


# ========================
# === HELPER FUNCTIONS ===
# ========================


# NOTE: This function might need to change when the file moves.
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
    Returns None if the series is empty or contains only NaN values.
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


# Generate all possible horizon combinations
def generate_horizon_combinations(horizons):
    """Generate all possible combinations of horizons"""
    from itertools import combinations

    all_combinations = []
    for r in range(1, len(horizons) + 1):
        for combo in combinations(horizons, r):
            all_combinations.append(list(combo))
    return all_combinations


# ==================================
# ======== MAIN PROCESSING =========
# ==================================
def main():
    project_root = get_project_root()
    data_processing_dir = project_root / "data_processing_dir"
    raw_data_dir = data_processing_dir / "raw"
    public_data_dir = project_root / "public" / "data"
    print("----- Starting Full Data Pre-Processing -----")

    # ===== 1. Get All Data From Sources =====
    print("Step 1: Ingesting all data from sources...")
    try:
        # Load static data files from the new raw data directory
        locations_df = pd.read_csv(data_processing_dir / "locations.csv", dtype={"location": str})
        locations_df = locations_df.loc[:, ~locations_df.columns.str.contains("^Unnamed")]  # Remove empty columns

        gt_df = pd.read_csv(
            raw_data_dir / "ground-truth/target-hospital-admissions.csv",
            parse_dates=["date"],
            dtype={"location": str},
        )

        thresholds_df = pd.read_csv(data_processing_dir / "thresholds.csv", dtype={"Location": str})

        # Load historical ground truth data
        historical_gt_path = raw_data_dir / "ground-truth" / "historical-data"
        historical_data_map = process_historical_ground_truth(historical_gt_path)
        print(f"   - Processed {len(historical_data_map)} historical ground truth snapshots")

        # Load evaluation score data
        eval_score_dir = raw_data_dir / "evaluations-score"
        wis_df = pd.read_csv(eval_score_dir / "WIS_ratio.csv", dtype={"location": str, "horizon": int})
        mape_df = pd.read_csv(eval_score_dir / "MAPE.csv", dtype={"Location": str, "horizon": int})
        coverage_df = pd.read_csv(eval_score_dir / "coverage.csv", dtype={"location": str, "horizon": int})

        # Define model names (should match epistorm-constants.ts)
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

        # ====== Load Prediction Data =====
        # Note: New format (unprocessed) vs Archive format have different headers
        # We need to process them separately then combine

        # Load "unprocessed" (new format) prediction files
        unprocessed_dfs = []
        for model in model_names:
            model_path = raw_data_dir / f"unprocessed/{model}"
            csv_files = list(model_path.glob("*.csv"))
            if not csv_files:
                print(f"   - No unprocessed files found for {model}")
                continue

            # Concatenate all CSV files for this model
            model_df = pd.concat(
                (pd.read_csv(f, low_memory=False, dtype={"location": str}) for f in csv_files),
                ignore_index=True,
            )
            model_df["model"] = model
            unprocessed_dfs.append(model_df)

        unprocessed_df = pd.concat(unprocessed_dfs, ignore_index=True) if unprocessed_dfs else pd.DataFrame()

        # Load "archive" (old format) prediction files
        archive_dfs = []
        for model in model_names:
            archive_path = raw_data_dir / f"archive/{model}"
            csv_files = list(archive_path.glob("*.csv"))
            if not csv_files:
                print(f"   - No archive files found for {model}")
                continue

            # Concatenate all CSV files for this model
            model_df = pd.concat(
                (pd.read_csv(f, low_memory=False, dtype={"location": str}) for f in csv_files),
                ignore_index=True,
            )
            model_df["model"] = model
            archive_dfs.append(model_df)

        archive_df = pd.concat(archive_dfs, ignore_index=True) if archive_dfs else pd.DataFrame()

        # For archive predictions data only, need to shift all "forecast_date" column values to 2 days back for all rows, since the convention changed from Friday-Saturday to Saturday-Saturday)
        archive_df["forecast_date"] = pd.to_datetime(archive_df["forecast_date"])

        archive_df["forecast_date"] = archive_df["forecast_date"] - pd.Timedelta(days=2)

        archive_df["forecast_date"] = archive_df["forecast_date"].dt.strftime("%Y-%m-%d")

        print(archive_df.head())

        print(f"   - Loaded {len(unprocessed_df)} rows from 'unprocessed' files")
        print(f"   - Loaded {len(archive_df)} rows from 'archive' files")

    except FileNotFoundError as e:
        print(f"FATAL ERROR: A required data file was not found: {e}")
        return
    except Exception as e:
        print(f"FATAL ERROR: Error loading data files: {e}")
        return

    # ===== 2. Extract Nowcasts & Process Predictions =====
    print("Step 2: Processing data by source type...")

    # --- A) Extract Nowcast Trends from UNPROCESSED data ONLY ---
    print("   - Extracting and processing nowcast trends...")
    all_nowcasts_df = pd.DataFrame()

    if not unprocessed_df.empty:
        # Define which models provide nowcast data (rate change predictions)
        nowcast_models = [
            "MOBS-GLEAM_FLUH",
            "MIGHTE-Nsemble",
            "CEPH-Rtrend_fluH",
            "FluSight-ensemble",
            "NU_UCSD-GLEAM_AI_FLUH",
            "MIGHTE-Joint",
        ]

        # Filter for nowcast data: rate change target where target_end_date == reference_date
        nowcast_trends_df = unprocessed_df[(unprocessed_df["target"] == "wk flu hosp rate change") & (unprocessed_df["model"].isin(nowcast_models))].copy()

        if not nowcast_trends_df.empty:
            # Convert dates and filter for nowcast (same date predictions)
            nowcast_trends_df["reference_date"] = pd.to_datetime(nowcast_trends_df["reference_date"])
            nowcast_trends_df["target_end_date"] = pd.to_datetime(nowcast_trends_df["target_end_date"])
            nowcast_trends_df = nowcast_trends_df[nowcast_trends_df["target_end_date"] == nowcast_trends_df["reference_date"]].copy()

            # Clean up output type IDs (remove "large_" prefix if present)
            nowcast_trends_df["output_type_id"] = nowcast_trends_df["output_type_id"].str.removeprefix("large_")

            # Pivot to get stable/increase/decrease columns
            all_nowcasts_df = nowcast_trends_df.pivot_table(
                index=["reference_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()

            # Ensure all required columns exist
            for col in ["stable", "increase", "decrease"]:
                if col not in all_nowcasts_df.columns:
                    all_nowcasts_df[col] = 0.0

            all_nowcasts_df = all_nowcasts_df.fillna(0)
            print(f"   - Processed nowcast trends. Shape: {all_nowcasts_df.shape}")
        else:
            print("   - No nowcast data ('wk flu hosp rate change') found in source files")

    # --- B) Process UNPROCESSED Hospitalization Predictions ---
    print("   - Processing unprocessed hospitalization predictions...")
    processed_unprocessed_preds_df = pd.DataFrame()

    if not unprocessed_df.empty:
        # Filter for hospitalization predictions
        hosp_preds_df = unprocessed_df[unprocessed_df["target"] == "wk inc flu hosp"].copy()
        hosp_preds_df["output_type_id"] = hosp_preds_df["output_type_id"].astype(str)

        # Keep only desired quantiles
        desired_quantiles = ["0.025", "0.05", "0.25", "0.5", "0.75", "0.95", "0.975"]
        hosp_preds_df = hosp_preds_df[hosp_preds_df["output_type_id"].isin(desired_quantiles)]

        if not hosp_preds_df.empty:
            # Pivot to get quantile columns
            processed_unprocessed_preds_df = hosp_preds_df.pivot_table(
                index=["reference_date", "target_end_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()

            # Ensure column names are strings
            processed_unprocessed_preds_df.columns = [str(c) for c in processed_unprocessed_preds_df.columns]
            print(f"   - Processed unprocessed predictions. Shape: {processed_unprocessed_preds_df.shape}")

    # --- C) Process ARCHIVE Hospitalization Predictions ---
    print("   - Processing archive hospitalization predictions...")
    processed_archive_preds_df = pd.DataFrame()

    if not archive_df.empty:
        # Clean up column names and standardize
        archive_clean_df = archive_df.copy()
        archive_clean_df.columns = archive_clean_df.columns.str.strip().str.strip('"')

        # Rename columns to match new format
        archive_clean_df.rename(
            columns={
                "forecast_date": "reference_date",
                "type": "output_type",
                "quantile": "output_type_id",
            },
            inplace=True,
        )

        # Filter for hospitalization predictions (may have different target strings in archive)
        hosp_archive_df = archive_clean_df[archive_clean_df["target"].str.contains("inc flu hosp", na=False)].copy()

        hosp_archive_df["output_type_id"] = hosp_archive_df["output_type_id"].astype(str)

        # Keep only desired quantiles
        desired_quantiles = ["0.025", "0.05", "0.25", "0.5", "0.75", "0.95", "0.975"]
        hosp_archive_df = hosp_archive_df[hosp_archive_df["output_type_id"].isin(desired_quantiles)]

        if not hosp_archive_df.empty:
            # Pivot to get quantile columns
            processed_archive_preds_df = hosp_archive_df.pivot_table(
                index=["reference_date", "target_end_date", "location", "model"],
                columns="output_type_id",
                values="value",
            ).reset_index()

            # Ensure column names are strings
            processed_archive_preds_df.columns = [str(c) for c in processed_archive_preds_df.columns]
            print(f"   - Processed archive predictions. Shape: {processed_archive_preds_df.shape}")

    # --- D) Combine All Prediction DataFrames ---
    print("   - Combining prediction data...")
    all_preds_df = pd.concat([processed_unprocessed_preds_df, processed_archive_preds_df], ignore_index=True)

    if all_preds_df.empty:
        print("FATAL ERROR: No valid hospitalization prediction data found after processing")
        return

    # --- E) Final Processing for Predictions ---
    print("   - Final prediction data processing...")

    # Ensure dates are datetime objects
    all_preds_df["reference_date"] = pd.to_datetime(all_preds_df["reference_date"])
    all_preds_df["target_end_date"] = pd.to_datetime(all_preds_df["target_end_date"])

    # Calculate horizon (weeks between reference and target dates)
    all_preds_df["horizon"] = ((all_preds_df["target_end_date"] - all_preds_df["reference_date"]).dt.days / 7).astype(int)

    # Keep only horizons 0, 1, 2, 3 (as per project requirements)
    all_preds_df = all_preds_df[all_preds_df["horizon"].isin([0, 1, 2, 3])]

    print(f"   - Final combined predictions. Shape: {all_preds_df.shape}")

    # --- F) Process Ground Truth Data ---
    print("   - Processing ground truth data...")

    # Rename columns to match expected format
    gt_df.rename(
        columns={
            "location": "stateNum",
            "value": "admissions",
            "weekly_rate": "weeklyRate",
        },
        inplace=True,
    )

    # Keep only required columns and remove rows with missing admissions
    gt_df = gt_df[["date", "stateNum", "admissions", "weeklyRate"]].copy()
    gt_df.dropna(subset=["admissions"], inplace=True)

    # ===== 3. Fix Ground Truth Data (Add Missing Saturdays) =====
    print("Step 3: Fixing ground truth data (adding missing Saturdays)...")

    # Find the overall date range across all data
    all_gt_dates = gt_df["date"]
    all_pred_dates = pd.concat([all_preds_df["reference_date"], all_preds_df["target_end_date"]])

    earliest_date = all_gt_dates.min()
    latest_date = all_pred_dates.max()

    print(f"   - Overall date range: {earliest_date.strftime('%Y-%m-%d')} to {latest_date.strftime('%Y-%m-%d')}")

    # Generate complete Saturday sequence
    full_date_range = pd.date_range(start=earliest_date, end=latest_date, freq="W-SAT")
    all_locations = locations_df["location"].unique()

    # Create complete grid of dates x locations
    complete_grid = pd.MultiIndex.from_product([full_date_range, all_locations], names=["date", "stateNum"])
    complete_gt_df = pd.DataFrame(index=complete_grid).reset_index()

    # Merge with existing ground truth data
    gt_df_fixed = pd.merge(complete_gt_df, gt_df, on=["date", "stateNum"], how="left")

    # Fill missing values with placeholder values (-1 for admissions, 0 for rate)
    gt_df_fixed = gt_df_fixed.fillna({"admissions": -1, "weeklyRate": 0})

    print(f"   - Ground truth fixed. Shape: {gt_df_fixed.shape}")

    # ===== 4. Generate Season Definitions =====
    print("Step 4: Generating season definitions...")

    # Separate containers for different purposes:
    # 1. Full range seasons - used for both time series processing AND evaluation aggregation
    full_range_seasons_info_for_processing = {}
    # 2. Dynamic periods - used ONLY for evaluation aggregation and metadata
    dynamic_periods = {}
    # 3. All seasons combined - used ONLY for evaluation aggregation
    all_seasons_for_evaluation = {}

    # Generate full range seasons (e.g., 2023-2024, 2022-2023, etc.)
    current_year = latest_date.year
    if latest_date.month > 7:  # If we're past July, we're in the next season
        current_year += 1

    season_end = pd.Timestamp(year=current_year, month=7, day=31)
    full_range_season_options = []
    season_index = 0

    print(f"   - Generating full range seasons starting from {current_year}...")

    most_current_season_tracker = True
    while season_end >= earliest_date:
        season_start = pd.Timestamp(year=current_year - 1, month=8, day=1)
        # SPECIAL CASE: If theoretical August 1st start is before our actual data,
        # use the earliest available data date instead (for the first partial season)
        if season_start < earliest_date:
            print(
                f"   - Adjusting season {current_year - 1}-{current_year} start from {season_start.strftime('%Y-%m-%d')} to {earliest_date.strftime('%Y-%m-%d')}"
            )
            season_start = earliest_date

        season_id = f"season-{current_year - 1}-{current_year}"

        # Store for time series processing (only full range seasons)
        full_range_seasons_info_for_processing[season_id] = {"start": season_start, "end": season_end, "mostCurrent": most_current_season_tracker}

        # Turn off the most current season marker after first run
        if most_current_season_tracker:
            most_current_season_tracker = False

        # Also add to evaluation seasons
        all_seasons_for_evaluation[season_id] = {"start": season_start, "end": season_end}

        # Create SeasonOption for metadata
        is_ongoing = latest_date <= season_end

        theoretical_august_start = pd.Timestamp(year=current_year - 1, month=8, day=1)
        is_partial = theoretical_august_start < earliest_date

        display_string = f"{current_year - 1}-{current_year}"
        if is_ongoing:
            display_string += " (Ongoing)"  # Don't forget the space blank
        elif is_partial:
            display_string = f"Partial {display_string}"

        time_value = f"{season_start.strftime('%Y-%m-%d')}/{season_end.strftime('%Y-%m-%d')}"

        result_season_option = {
            "index": season_index,
            "seasonId": season_id,
            "displayString": display_string,
            "timeValue": time_value,
            "startDate": season_start,
            "endDate": season_end,
        }

        # DEBUG
        print(f"Parsing new season option: {result_season_option}")

        full_range_season_options.append(result_season_option)

        season_index += 1
        current_year -= 1
        season_end = pd.Timestamp(year=current_year, month=7, day=31)

    # Reverse to get chronological order (earliest to latest)
    full_range_season_options.reverse()

    # Re-assign indices after reversing
    for i, season in enumerate(full_range_season_options):
        season["index"] = i

    # Set default season (the ongoing/latest one)
    default_season_tv = full_range_season_options[-1]["timeValue"] if full_range_season_options else ""

    print(f"   - Generated {len(full_range_season_options)} full range seasons")

    # Generate dynamic time periods
    last_valid_ref_date = all_preds_df["reference_date"].max()
    print(f"   - Last valid reference date for dynamic periods: {last_valid_ref_date.strftime('%Y-%m-%d')}")

    # Put the latest valid reference date also into metadata, to become the default selected date
    default_selected_date = last_valid_ref_date

    dynamic_period_definitions = [
        ("last-2-weeks", "Last 2 Weeks", 1),
        ("last-4-weeks", "Last 4 Weeks", 3),
        ("last-8-weeks", "Last 8 Weeks", 7),
    ]

    dynamic_season_options = []
    for i, (period_id, display_string, weeks_back) in enumerate(dynamic_period_definitions):
        # Real period: start is exactly N weeks before the latest reference date
        start_date = last_valid_ref_date - timedelta(weeks=weeks_back)
        end_date = last_valid_ref_date

        # Display should start on the immediate next Sunday after the real start date
        next_sunday_offset = (6 - start_date.weekday()) % 7
        display_start_date = start_date + timedelta(days=next_sunday_offset)

        # Format for Season Overview display: (MM dd, YYYY - MM dd, YYYY)
        sub_display_value = f"({display_start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')})"

        # Store for evaluation aggregation only
        dynamic_periods[period_id] = {"start": start_date, "end": end_date}
        all_seasons_for_evaluation[period_id] = {"start": start_date, "end": end_date}

        # Create DynamicSeasonOption for metadata (matching CustomDataInterface.md)
        dynamic_season_options.append(
            {
                "index": i,
                "label": period_id,
                "displayString": display_string,
                "isDynamic": True,
                "subDisplayValue": sub_display_value,
                "startDate": start_date,
                "endDate": end_date,
            }
        )

    print(f"   - Generated {len(dynamic_season_options)} dynamic time periods")

    # ===== 5. Partition Time-Series Data by Season =====

    # Process Nowcast Trends by season
    print("     - Partitioning Nowcast trends by season...")
    nowcast_trends_by_season = {}
    if not all_nowcasts_df.empty:
        # Process each full range season for nowcast trends
        for season_id, dates in full_range_seasons_info_for_processing.items():
            print(f"   - Processing nowcast trends for season: {season_id}")

            # Filter nowcast data for this season
            season_nowcast_df = all_nowcasts_df[
                (all_nowcasts_df["reference_date"] >= dates["start"]) & (all_nowcasts_df["reference_date"] <= dates["end"])
            ].copy()

            if season_nowcast_df.empty:
                nowcast_trends_by_season[season_id] = {}
                continue

            # Convert to nested dictionary structure for this season
            season_nowcast_dict = {}
            for _, row in season_nowcast_df.iterrows():
                model = row["model"]
                date_iso = row["reference_date"].strftime("%Y-%m-%d")
                location = row["location"]

                season_nowcast_dict.setdefault(model, {}).setdefault(date_iso, {})[location] = {
                    "decrease": float(row["decrease"]),
                    "increase": float(row["increase"]),
                    "stable": float(row["stable"]),
                }

            nowcast_trends_by_season[season_id] = season_nowcast_dict

    print(f"   - Nowcast trends partitioned for {len(nowcast_trends_by_season)} seasons")

    print("Step 5: Partitioning time-series data by season...")
    time_series_data = {}

    print("   - Creating fast lookup indexes for dataframes...")
    # Create indexed dataframes for efficient lookups
    gt_df_indexed = gt_df_fixed.set_index(["date", "stateNum"]).sort_index()
    preds_df_indexed = all_preds_df.set_index(["reference_date", "location", "model"]).sort_index()
    all_locations = locations_df["location"].unique()

    # IMPORTANT: Only process full range seasons for time series partitioning
    # Dynamic periods are NOT included here as per requirements
    for season_id, dates in full_range_seasons_info_for_processing.items():
        print(f"   - Processing time series for season: {season_id}")

        # Filter predictions for this season
        season_preds = all_preds_df[(all_preds_df["reference_date"] >= dates["start"]) & (all_preds_df["reference_date"] <= dates["end"])]

        # Initialize structure according to DataContract.md
        time_series_data[season_id] = {}

        # Calculate season-level aggregated dates across all models
        if season_preds.empty:
            season_first_pred_ref_date = dates["end"]
            season_last_pred_ref_date = dates["start"]
            season_last_pred_target_date = dates["start"]
        else:
            season_first_pred_ref_date = season_preds["reference_date"].min()
            season_last_pred_ref_date = season_preds["reference_date"].max()
            season_last_pred_target_date = season_preds["target_end_date"].max()

        # Store season-level dates for quick reference
        time_series_data[season_id]["firstPredRefDate"] = season_first_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(season_first_pred_ref_date) else None
        time_series_data[season_id]["lastPredRefDate"] = season_last_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(season_last_pred_ref_date) else None
        time_series_data[season_id]["lastPredTargetDate"] = (
            season_last_pred_target_date.strftime("%Y-%m-%d") if pd.notna(season_last_pred_target_date) else None
        )

        # Process each model separately within this season
        for model_name in model_names:
            model_preds = season_preds[season_preds["model"] == model_name]

            # Calculate model-specific dates within this season
            if model_preds.empty:
                first_pred_ref_date = dates["end"]
                last_pred_ref_date = dates["start"]
                last_pred_target_date = dates["start"]
            else:
                first_pred_ref_date = model_preds["reference_date"].min()
                last_pred_ref_date = model_preds["reference_date"].max()
                last_pred_target_date = model_preds["target_end_date"].max()

            # Initialize model structure
            time_series_data[season_id][model_name] = {
                "firstPredRefDate": (first_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(first_pred_ref_date) else None),
                "lastPredRefDate": (last_pred_ref_date.strftime("%Y-%m-%d") if pd.notna(last_pred_ref_date) else None),
                "lastPredTargetDate": (last_pred_target_date.strftime("%Y-%m-%d") if pd.notna(last_pred_target_date) else None),
                "partitions": {
                    "pre-forecast": {},
                    "full-forecast": {},
                    "forecast-tail": {},
                    "post-forecast": {},
                },
            }

            # Define partition date ranges according to AboutDateTime.md
            partition_ranges = {
                "pre-forecast": (dates["start"], first_pred_ref_date - timedelta(days=1)),
                "full-forecast": (first_pred_ref_date, last_pred_ref_date),
                "forecast-tail": (last_pred_ref_date + timedelta(days=1), last_pred_target_date),
                "post-forecast": (last_pred_target_date + timedelta(days=1), dates["end"]),
            }

            # Process each partition
            for partition_name, (start_date, end_date) in partition_ranges.items():
                # Skip invalid date ranges
                if pd.isna(start_date) or pd.isna(end_date) or start_date > end_date:
                    continue

                partition_data = {}

                # Get all dates that fall within this partition
                gt_dates_in_partition = gt_df_fixed.loc[
                    (gt_df_fixed["date"] >= start_date) & (gt_df_fixed["date"] <= end_date),
                    "date",
                ]
                pred_dates_in_partition = model_preds.loc[
                    (model_preds["reference_date"] >= start_date) & (model_preds["reference_date"] <= end_date),
                    "reference_date",
                ]

                # Combine and get unique dates
                all_unique_dates = pd.concat([gt_dates_in_partition, pred_dates_in_partition]).unique()

                # Process each date in this partition
                for ref_date in all_unique_dates:
                    if not (start_date <= pd.to_datetime(ref_date) <= end_date):
                        continue

                    ref_date_iso = pd.to_datetime(ref_date).strftime("%Y-%m-%d")

                    if ref_date_iso not in partition_data:
                        partition_data[ref_date_iso] = {}

                    # Process each location for this date
                    for state_num in all_locations:
                        if state_num not in partition_data[ref_date_iso]:
                            partition_data[ref_date_iso][state_num] = {}

                        entry = partition_data[ref_date_iso][state_num]

                        # No longer storing duplicate ground truth inside model
                        """ # Add ground truth data if available
                        try:
                            gt_row = gt_df_indexed.loc[(ref_date, state_num)]
                            if pd.notna(gt_row["admissions"]) and gt_row["admissions"] >= 0:
                                entry["groundTruth"] = {
                                    "admissions": float(gt_row["admissions"]),
                                    "weeklyRate": float(gt_row["weeklyRate"]),
                                }
                        except KeyError:
                            pass  # No ground truth data for this date/location """

                        # Add prediction data for this specific model
                        try:
                            preds_on_date = preds_df_indexed.loc[(ref_date, state_num, model_name)]
                            if not preds_on_date.empty:
                                predictions_dict = {}

                                # Handle both Series and DataFrame cases
                                if isinstance(preds_on_date, pd.Series):
                                    preds_on_date = preds_on_date.to_frame().T

                                # Process each prediction row (different horizons)
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
                            pass  # No prediction data for this date/location/model

                # Store the partition data
                time_series_data[season_id][model_name]["partitions"][partition_name] = partition_data

    print("   - Time series partitioning complete (full range seasons only)")

    # ===== 5b. Process Ground Truth Data =====
    print("Step 5b: Processing centralized ground truth data...")
    ground_truth_data = {}

    # Process each full range season for ground truth
    for season_id, dates in full_range_seasons_info_for_processing.items():
        print(f"   - Processing ground truth for season: {season_id}")

        ground_truth_data[season_id] = {}

        # Get all dates in this season
        season_dates = pd.date_range(start=dates["start"], end=dates["end"], freq="W-SAT")

        for ref_date in season_dates:
            ref_date_iso = ref_date.strftime("%Y-%m-%d")
            ground_truth_data[season_id][ref_date_iso] = {}

            # Get ground truth for all states on this date
            for state_num in all_locations:
                try:
                    gt_row = gt_df_fixed[(gt_df_fixed["date"] == ref_date) & (gt_df_fixed["stateNum"] == state_num)]
                    if not gt_row.empty and pd.notna(gt_row.iloc[0]["admissions"]) and gt_row.iloc[0]["admissions"] >= 0:
                        ground_truth_data[season_id][ref_date_iso][state_num] = {
                            "admissions": float(gt_row.iloc[0]["admissions"]),
                            "weeklyRate": float(gt_row.iloc[0]["weeklyRate"]),
                        }
                except (KeyError, IndexError):
                    # No ground truth data for this date/location
                    pass

    print(f"   - Ground truth data processed for {len(ground_truth_data)} seasons")

    # ===== 6. Aggregate Evaluation Data =====
    print("Step 6: Pre-aggregating evaluation data...")

    # Clean and standardize evaluation dataframes
    print("   - Cleaning evaluation score dataframes...")

    # Filter to only include our models and positive horizons
    wis_df = wis_df[wis_df["Model"].isin(model_names) & (wis_df["horizon"] >= 0)].copy()
    wis_df["horizon"] = wis_df["horizon"].astype(int)
    mape_df = mape_df[mape_df["Model"].isin(model_names) & (mape_df["horizon"] >= 0)].copy()
    mape_df["horizon"] = mape_df["horizon"].astype(int)
    coverage_df = coverage_df[coverage_df["Model"].isin(model_names) & (coverage_df["horizon"] >= 0)].copy()
    coverage_df["horizon"] = coverage_df["horizon"].astype(int)

    # Standardize WIS data
    wis_df["metric"] = "WIS/Baseline"
    wis_df.rename(columns={"Model": "model", "wis_ratio": "score", "location": "stateNum"}, inplace=True)

    # Standardize MAPE data
    mape_df["metric"] = "MAPE"
    mape_df.rename(columns={"Model": "model", "MAPE": "score", "Location": "stateNum"}, inplace=True)
    mape_df["score"] *= 100  # Convert to percentage

    # Standardize Coverage data
    coverage_df.rename(columns={"Model": "model", "location": "stateNum"}, inplace=True)

    # Create coverage data for different purposes:
    # 1. Long format for PI Chart aggregation
    coverage_long_df = coverage_df.melt(
        id_vars=["reference_date", "model", "stateNum", "horizon"],
        value_vars=[f"{cov}_cov" for cov in [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98]],
        var_name="coverage_level",
        value_name="score",
    )
    coverage_long_df["coverage_level"] = coverage_long_df["coverage_level"].str.replace("_cov", "").astype(int)
    coverage_long_df["score"] *= 100

    # 2. Standard format for State Map (using 95% coverage)
    coverage_scores_df = coverage_df[["reference_date", "model", "stateNum", "horizon"]].copy()
    coverage_scores_df["metric"] = "Coverage"
    coverage_scores_df["score"] = coverage_df["95_cov"] * 100

    # Combine standard metrics (WIS, MAPE, Coverage for state map)
    eval_scores_df = pd.concat([wis_df, mape_df, coverage_scores_df], ignore_index=True)

    # Standardize date and location formats
    for df in [eval_scores_df, coverage_long_df]:
        df["reference_date"] = pd.to_datetime(df["reference_date"])
        df["stateNum"] = df["stateNum"].astype(str).str.zfill(2)

    # Calculate target_end_date for proper filtering against time ranges generated using referenceDate's perspective
    print("   - Calculating target end dates for evaluation filtering...")
    eval_scores_df["target_end_date"] = eval_scores_df["reference_date"] + pd.to_timedelta(eval_scores_df["horizon"] * 7, unit="D")
    coverage_long_df["target_end_date"] = coverage_long_df["reference_date"] + pd.to_timedelta(coverage_long_df["horizon"] * 7, unit="D")

    print("   - Evaluation score files cleaned and standardized")

    # Combine all seasons for comprehensive assignment
    all_seasons_combined = {**full_range_seasons_info_for_processing, **dynamic_periods}

    # Create season-specific evaluation datasets
    print("\n   - Creating season-specific evaluation datasets...")
    iqr_data = {}
    state_map_data = {}
    coverage_data = {}

    # Process each season independently
    for season_id, season_dates in all_seasons_combined.items():
        print(f"\n   - Processing evaluation data for season: {season_id}")
        print(f"     Date range: {season_dates['start'].strftime('%Y-%m-%d')} to {season_dates['end'].strftime('%Y-%m-%d')}")

        # Filter evaluation data for this specific season
        season_eval_df = eval_scores_df[
            (eval_scores_df["reference_date"] >= season_dates["start"]) & (eval_scores_df["target_end_date"] <= season_dates["end"])
        ].copy()

        season_coverage_df = coverage_long_df[
            (coverage_long_df["reference_date"] >= season_dates["start"]) & (coverage_long_df["target_end_date"] <= season_dates["end"])
        ].copy()

        print(f"     Evaluation entries: {len(season_eval_df)}")
        print(f"     Coverage entries: {len(season_coverage_df)}")

        if len(season_eval_df) > 0:
            print(f"     Models in eval data: {sorted(season_eval_df['model'].unique())}")
            print(f"     Metrics in eval data: {sorted(season_eval_df['metric'].unique())}")
            print(f"     Horizons in eval data: {sorted(season_eval_df['horizon'].unique())}")
            print(
                f"     Reference date range: {season_eval_df['reference_date'].min().strftime('%Y-%m-%d')} to {season_eval_df['reference_date'].max().strftime('%Y-%m-%d')}"
            )
            print(
                f"     Target date range: {season_eval_df['target_end_date'].min().strftime('%Y-%m-%d')} to {season_eval_df['target_end_date'].max().strftime('%Y-%m-%d')}"
            )

        # State map aggregations
        if len(season_eval_df) > 0:
            state_map_agg = season_eval_df.groupby(["metric", "model", "stateNum", "horizon"])["score"].agg(["sum", "count"]).reset_index()
            for _, row in state_map_agg.iterrows():
                horizon_int = int(row["horizon"])
                state_map_data.setdefault(season_id, {}).setdefault(row["metric"], {}).setdefault(row["model"], {}).setdefault(row["stateNum"], {})[
                    horizon_int
                ] = {"sum": float(row["sum"]), "count": int(row["count"])}

        # PI chart aggregations
        if len(season_coverage_df) > 0:
            coverage_agg = season_coverage_df.groupby(["model", "horizon", "coverage_level"])["score"].agg(["sum", "count"]).reset_index()
            for _, row in coverage_agg.iterrows():
                horizon_int = int(row["horizon"])
                coverage_data.setdefault(season_id, {}).setdefault(row["model"], {}).setdefault(horizon_int, {})[int(row["coverage_level"])] = {
                    "sum": float(row["sum"]),
                    "count": int(row["count"]),
                }

        # Build state averages from the state_map_data we just calculated
        # Sanity Check using season_id
        if season_id in state_map_data:
            # Dynamically get all available horizons for this season (to accomodate dynamic periods)
            available_horizons = set()
            for metric_data in state_map_data[season_id].values():
                for model_data in metric_data.values():
                    for state_data in model_data.values():
                        available_horizons.update(state_data.keys())

            available_horizons = sorted(list(available_horizons))
            horizon_combinations = generate_horizon_combinations(available_horizons)

            print(f"     Calculating IQR for {len(horizon_combinations)} horizon combinations: {horizon_combinations}")

            for metric, metric_data in state_map_data[season_id].items():
                # Skip Coverage metric for IQR calculations
                if metric == "Coverage":
                    continue

                for model, model_data in metric_data.items():
                    # Calculate IQR for each horizon combination
                    for horizon_combo in horizon_combinations:
                        # Create horizon key (e.g., "0", "1,2", "0,1,2,3")
                        horizon_key = ",".join(map(str, sorted(horizon_combo)))

                        # Calculate state averages for this combination
                        state_averages = []

                        # Get all states that have data for any horizon in this combination
                        all_states = set()
                        for horizon in horizon_combo:
                            for state_num in model_data.keys():
                                # In location Aggregation, we ACTUALLY want "US" to be included. We need 52 states + US data.
                                if horizon in model_data[state_num]:
                                    all_states.add(state_num)

                        # Calculate combined average for each state
                        for state_num in all_states:
                            total_sum = 0
                            total_count = 0

                            for horizon in horizon_combo:
                                if horizon in model_data[state_num]:
                                    agg_data = model_data[state_num][horizon]
                                    total_sum += agg_data["sum"]
                                    total_count += agg_data["count"]

                            if total_count > 0:
                                state_averages.append(total_sum / total_count)

                        # Calculate IQR stats if we have at least 1 state
                        if len(state_averages) >= 1:
                            stats = calculate_boxplot_stats(pd.Series(state_averages))
                            if stats:
                                # Update stats with state-level information
                                stats["count"] = len(state_averages)
                                stats["stateAverages"] = state_averages
                                stats["scores"] = state_averages  # Replace with state averages

                                # Store using horizon key
                                iqr_data.setdefault(season_id, {}).setdefault(metric, {}).setdefault(model, {})[horizon_key] = stats

    print("IQR data calculated for all horizon combinations")

    # ===== 6b. Store Raw Scores for Single Model Views =====
    print("   - Storing raw evaluation scores for Single Model views...")
    raw_scores_data = {}

    # Process each season for raw scores
    for season_id, season_dates in full_range_seasons_info_for_processing.items():
        # Filter evaluation data for this specific season
        season_eval_df = eval_scores_df[
            (eval_scores_df["reference_date"] >= season_dates["start"]) & (eval_scores_df["target_end_date"] <= season_dates["end"])
        ].copy()

        season_eval_df = season_eval_df[season_eval_df["metric"] != "Coverage"].copy()

        if len(season_eval_df) == 0:
            continue

        # Group by metric, model, state, and horizon
        grouped = season_eval_df.groupby(["metric", "model", "stateNum", "horizon"])

        for (metric, model, state_num, horizon), group_df in grouped:
            # Convert dates to ISO strings and create score entries
            score_entries = []
            for _, row in group_df.iterrows():
                score_entries.append(
                    {
                        "referenceDate": row["reference_date"].strftime("%Y-%m-%d"),
                        "targetEndDate": row["target_end_date"].strftime("%Y-%m-%d"),
                        "score": float(row["score"]),
                    }
                )

            # Sort by reference date
            score_entries.sort(key=lambda x: x["referenceDate"])

            # Store in nested structure
            horizon_int = int(horizon)
            (raw_scores_data.setdefault(season_id, {}).setdefault(metric, {}).setdefault(model, {}).setdefault(state_num, {})[horizon_int]) = score_entries

    print(f"   - Raw scores stored for {len(raw_scores_data)} seasons")

    # ===== 7. Write Split JSON Files =====
    print("Step 7: Writing split JSON files...")

    # Create directory structure
    auxiliary_dir = public_data_dir / "auxiliary"
    auxiliary_dir.mkdir(exist_ok=True, parents=True)

    dynamic_dir = public_data_dir / "dynamic-time-periods"
    dynamic_dir.mkdir(exist_ok=True, parents=True)

    historical_dir = public_data_dir / "historical-ground-truth-data"
    historical_dir.mkdir(exist_ok=True, parents=True)

    # ===== 7A. Process & Write Auxiliary Data =====
    # Process thresholds data using imported function
    print("   - Processing thresholds data...")
    thresholds_dict = process_thresholds(thresholds_df)

    # Process locations data using imported function
    print("   - Processing locations data...")
    locations_list = process_locations(locations_df)

    print("   - Writing auxiliary data files...")

    # Write locations data
    with open(auxiliary_dir / "locationsData.json", "w") as f:
        json.dump(locations_list, f, cls=NpEncoder, separators=(",", ":"))

    # Write thresholds data
    with open(auxiliary_dir / "thresholdsData.json", "w") as f:
        json.dump(thresholds_dict, f, cls=NpEncoder, separators=(",", ":"))

    # Write season metadata
    season_metadata = {
        "fullRangeSeasons": full_range_season_options,
        "dynamicTimePeriod": dynamic_season_options,
        "modelNames": model_names,
        "defaultSeasonTimeValue": default_season_tv,
        "defaultSelectedDate": default_selected_date,  # This will go into settings and decide which day is selected by default
    }
    with open(auxiliary_dir / "seasonMetadata.json", "w") as f:
        json.dump(season_metadata, f, cls=NpEncoder, separators=(",", ":"))

    print(f"   - Written auxiliary data: locations ({len(locations_list)} entries), thresholds ({len(thresholds_dict)} entries), metadata")

    # ===== 7B. Write Historical Ground Truth Data =====
    print("   - Writing historical ground truth data...")
    with open(historical_dir / "historical-ground-truth-data.json", "w") as f:
        json.dump(historical_data_map, f, cls=NpEncoder, separators=(",", ":"))

    print(f"   - Written historical data: {len(historical_data_map)} snapshots")

    # ===== 7C. Write Full Range Season Data =====
    print("   - Writing full range season data...")

    for season_id, season_info in full_range_seasons_info_for_processing.items():
        # Conditionally assign "current_" to the current season, marked by a special field
        if season_info["mostCurrent"]:
            folder_name = f"current_{season_id}"
        else:
            folder_name = season_id

        season_dir = public_data_dir / folder_name
        season_dir.mkdir(exist_ok=True, parents=True)

        print(f"   - Writing data for {season_id} -> {folder_name}/")

        # Write ground truth data for this season
        season_ground_truth = ground_truth_data.get(season_id, {})
        with open(season_dir / "groundTruthData.json", "w") as f:
            json.dump(season_ground_truth, f, cls=NpEncoder, separators=(",", ":"))

        # Write prediction data for this season
        season_predictions = time_series_data.get(season_id, {})
        with open(season_dir / "predictionsData.json", "w") as f:
            json.dump(season_predictions, f, cls=NpEncoder, separators=(",", ":"))

        # Write nowcast trends data for this season
        season_nowcast = nowcast_trends_by_season.get(season_id, {})
        with open(season_dir / "nowcastTrendsData.json", "w") as f:
            json.dump(season_nowcast, f, cls=NpEncoder, separators=(",", ":"))

        # Write evaluations data for this season (precalculated + raw scores)
        season_evaluations_precalculated = {
            "precalculated": {
                "iqr": iqr_data.get(season_id, {}),
                "stateMap_aggregates": state_map_data.get(season_id, {}),
                "detailedCoverage_aggregates": coverage_data.get(season_id, {}),
            },
        }
        season_evaluations_raw_scores = {
            "rawScores": raw_scores_data.get(season_id, {}),
        }
        with open(season_dir / "evaluationsPrecalculatedData.json", "w") as f:
            json.dump(season_evaluations_precalculated, f, cls=NpEncoder, separators=(",", ":"))

        with open(season_dir / "evaluationsRawScoresData.json", "w") as f:
            json.dump(season_evaluations_raw_scores, f, cls=NpEncoder, separators=(",", ":"))

        print(f"     - Written 4 files for {season_id}")

    # ===== 7D. Write Dynamic Time Period Data =====
    print("   - Writing dynamic time period data...")

    for period_id in dynamic_periods.keys():
        # Each dynamic period gets its own JSON file containing only evaluation data
        period_evaluations = {
            "precalculated": {
                "iqr": iqr_data.get(period_id, {}),
                "stateMap_aggregates": state_map_data.get(period_id, {}),
                "detailedCoverage_aggregates": coverage_data.get(period_id, {}),
            }
            # Note: No raw scores for dynamic periods as per documentation
        }

        with open(dynamic_dir / f"{period_id}.json", "w") as f:
            json.dump(period_evaluations, f, cls=NpEncoder, separators=(",", ":"))

        print(f"   - Written {period_id}.json")

    print("Step 7: All JSON files written successfully!")


if __name__ == "__main__":
    main()
