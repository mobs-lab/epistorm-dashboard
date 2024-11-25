import pandas as pd
import os
from pathlib import Path

def get_project_root():
    """Get the project root directory"""
    current_file = Path(__file__)
    return str(current_file.parent.parent)

def clean_surveillance_data():
    """
    Clean surveillance data by removing rows containing 'NA' values.
    Handles both current and historical surveillance data.
    """
    project_root = get_project_root()

    # Define paths relative to project root
    current_data_path = os.path.join(
        project_root,
        "public/data/ground-truth/target-hospital-admissions.csv"
    )

    historical_data_dir = os.path.join(
        project_root,
        "public/data/ground-truth/historical-data"
    )

    # Process current surveillance data
    if os.path.exists(current_data_path):
        print(f"Processing current surveillance data: {current_data_path}")
        df = pd.read_csv(current_data_path)
        original_count = len(df)

        # Remove rows containing 'NA' (case-insensitive)
        df = df.replace('NA', pd.NA, regex=True)
        df = df.dropna()

        # Save cleaned data back to the same location
        df.to_csv(current_data_path, index=False)

        print(f"Current surveillance data processed:")
        print(f"  - Original rows: {original_count}")
        print(f"  - Rows removed: {original_count - len(df)}")
        print(f"  - Remaining rows: {len(df)}")

    # Process historical surveillance data
    if os.path.exists(historical_data_dir):
        for filename in os.listdir(historical_data_dir):
            if filename.endswith('.csv'):
                file_path = os.path.join(historical_data_dir, filename)
                print(f"\nProcessing historical data: {filename}")

                df = pd.read_csv(file_path)
                original_count = len(df)

                # Remove rows containing 'NA' (case-insensitive)
                df = df.replace('NA', pd.NA, regex=True)
                df = df.dropna()

                # Save cleaned data back to the same location
                df.to_csv(file_path, index=False)

                print(f"Historical file processed:")
                print(f"  - Original rows: {original_count}")
                print(f"  - Rows removed: {original_count - len(df)}")
                print(f"  - Remaining rows: {len(df)}")

if __name__ == "__main__":
    clean_surveillance_data()