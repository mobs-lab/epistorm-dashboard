import pandas as pd
from pathlib import Path


def process_locations(locations_df: pd.DataFrame):
    """Processes the locations data into a list of dictionaries."""
    locations_list = []
    for _, row in locations_df.iterrows():
        locations_list.append(
            {
                "stateNum": row["location"],
                "state": row["abbreviation"],
                "stateName": row["location_name"],
                "population": int(row["population"]),
            }
        )
    return locations_list


def process_thresholds(thresholds_df: pd.DataFrame):
    """Processes the thresholds data into a dictionary."""
    thresholds_df.rename(columns={"Location": "stateNum"}, inplace=True)
    thresholds_dict = {}
    for _, row in thresholds_df.iterrows():
        thresholds_dict[row["stateNum"]] = {
            "medium": float(row["Medium"]),
            "high": float(row["High"]),
            "veryHigh": float(row["Very High"]),
        }
    return thresholds_dict


def process_historical_ground_truth(historical_gt_path: Path):
    """Processes historical ground truth snapshot files into a nested dictionary."""
    historical_data_map = {}
    if not historical_gt_path.exists():
        print(f"Warning: Historical ground truth directory not found at {historical_gt_path}")
        return historical_data_map

    for csv_file in historical_gt_path.glob("*.csv"):
        try:
            # Extract date from filename like 'target-hospital-admissions_2023-09-23.csv'
            snapshot_date_iso = csv_file.stem.split("_")[-1]

            # Initialize the structure for this snapshot date
            historical_data_map[snapshot_date_iso] = {}

            df = pd.read_csv(csv_file, dtype={"location": str})

            # Clean up each file's data, remove all invalid rows containing NaN, etc.
            # Ensure required columns exist
            required_cols = ["date", "location", "value", "weekly_rate"]
            if not all(col in df.columns for col in required_cols):
                print(f"Warning: Skipping {csv_file.name}, missing required columns.")
                continue

            # Clean the data: remove rows with missing or invalid values
            df = df.dropna(subset=["value", "weekly_rate"])
            
            # Remove rows with invalid numeric values (negative admissions, etc.)
            df = df[df["value"] >= 0]
            df = df[df["weekly_rate"] >= 0]
            
            # Convert location to string and ensure it's properly formatted
            df["location"] = df["location"].astype(str).str.zfill(2)
            
            # Convert dates to datetime for validation
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.dropna(subset=["date"])  # Remove rows with invalid dates

            if df.empty:
                print(f"Warning: No valid data found in {csv_file.name} after cleaning")
                continue

            df.rename(columns={"value": "admissions", "weekly_rate": "weeklyRate"}, inplace=True)

            # Group by the actual date of the data point
            for _, row in df.iterrows():
                data_date_iso = row["date"].strftime("%Y-%m-%d")
                state_num = row["location"]

                if data_date_iso not in historical_data_map[snapshot_date_iso]:
                    historical_data_map[snapshot_date_iso][data_date_iso] = {}

                historical_data_map[snapshot_date_iso][data_date_iso][state_num] = {
                    "admissions": float(row["admissions"]),
                    "weeklyRate": float(row["weeklyRate"]),
                }

            print(f"   - Processed {csv_file.name}: {len(df)} valid rows")

        except Exception as e:
            print(f"Error processing historical file {csv_file.name}: {e}")

    return historical_data_map
