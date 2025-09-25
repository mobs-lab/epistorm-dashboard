import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import datetime, timedelta

# NOTE: This function might need to change when the file moves.
def get_project_root():
    """Returns the project's root directory as a Path object."""
    return Path(__file__).resolve().parent.parent

# Define path of archive data to clean up and transform
archive_pred_data_path = get_project_root() / "data_processing_dir/raw/archive/"

# Only 4 models are available in archive data
archive_pred_available_teams = ["CEPH-Rtrend_fluH", "FluSight-ensemble", "MIGHTE-Nsemble", "MOBS-GLEAM_FLUH"]

print("Starting archive predictions data cleaning...")

# Iterate through all the available archive data folders
for team in archive_pred_available_teams:
    team_data_folder_path = Path(archive_pred_data_path) / team
    print(f"\nProcessing team: {team}")
    print(f"  Folder path: {team_data_folder_path}")

    # Read all the csv files in the folder
    csv_files = list(team_data_folder_path.glob("*.csv"))
    print(f"  Found {len(csv_files)} CSV files")

    for file in csv_files:
        print(f"  Processing file: {file.name}")

        # Read the CSV file
        df = pd.read_csv(file, low_memory=False, dtype={"location": str})

        # Clean column names (remove quotes and spaces)
        df.columns = df.columns.str.strip().str.strip('"')

        # Convert forecast_date to datetime and shift 5 days forward
        df['forecast_date'] = pd.to_datetime(df['forecast_date'])
        df['forecast_date'] = df['forecast_date'] + timedelta(days=5)

        # Extract horizon from target string and adjust mapping
        # "1 wk ahead" becomes horizon 0, "2 wk ahead" becomes horizon 1, etc.
        df['horizon'] = df['target'].str.extract(r'(\d+) wk ahead')[0].astype(int) - 1

        # Standardize the target column
        df['target'] = 'wk inc flu hosp'

        # Rename columns to match modern format
        df.rename(columns={
            'forecast_date': 'reference_date',
            'type': 'output_type',
            'quantile': 'output_type_id'
        }, inplace=True)

        # Convert reference_date back to string in ISO format
        df['reference_date'] = df['reference_date'].dt.strftime('%Y-%m-%d')

        # Ensure output_type_id is string for consistency
        df['output_type_id'] = df['output_type_id'].astype(str)

        # Add a helpful model column
        df['model'] = team

        # Drop any rows with NaN values in critical columns
        df.dropna(subset=['reference_date', 'target_end_date', 'location', 'value'], inplace=True)

        # Update the filename with shifted date
        date_str = file.name[:10]  # First 10 characters are the date
        original_date = pd.to_datetime(date_str)
        new_date = original_date + timedelta(days=5)
        new_file_name = new_date.strftime("%Y-%m-%d") + "-" + team + ".csv"
        new_file_path = team_data_folder_path / new_file_name

        # Save the transformed data
        df.to_csv(new_file_path, index=False)

        # Remove the old file if different from new
        if file.name != new_file_name:
            file.unlink()
            print(f"    Renamed: {file.name} -> {new_file_name}")

        print(f"    Shifted {len(df)} rows by 5 days forward")
        print(f"    Horizon range: {df['horizon'].min()} to {df['horizon'].max()}")

print("\nArchive predictions cleaning complete!")
