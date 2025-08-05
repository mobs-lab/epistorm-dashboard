import pandas as pd
import glob
import os
from pathlib import Path


def get_project_root():
    """ Get the project root directory """
    current_file = Path(__file__)
    return str(current_file.parent.parent)


def data_transformation(team_name):
    """
    Data transformation for main line chart and nowcasted hospitalization rate change trends.

    Args:
    team_name: str, name of the team

    Returns:
    df: pd.DataFrame, transformed data
    """
    project_root = get_project_root()

    # Define paths relative to project root
    team_data_source_pattern = os.path.join(
        project_root,
        "public",
        "data",
        "unprocessed",
        team_name,
        f"*{team_name}.*"  # Match any file extension
    )

    # Debug print statements
    print(f"\nProcessing team: {team_name}")
    print(f"Looking for files in pattern: {team_data_source_pattern}")
    files_found = glob.glob(team_data_source_pattern)
    print(f"Files found: {files_found}")

    if not files_found:
        print(f"No files found for {team_name}, skipping...")
        return

    predictions_target_path = os.path.join(
        project_root,
        "public",
        "data",
        "processed",
        team_name,
        "predictions.csv"
    )

    trends_target_path = os.path.join(
        project_root,
        "public",
        "data",
        "processed",
        team_name,
        "nowcast_trends.csv"
    )

    # Ensure target directories exist
    os.makedirs(os.path.dirname(predictions_target_path), exist_ok=True)
    os.makedirs(os.path.dirname(trends_target_path), exist_ok=True)

    # Load all CSV files in forecasts folder into a single data frame, ignore unneeded columns.
    team_data = pd.concat(
        (pd.read_csv(f, usecols=['reference_date', 'target', 'target_end_date', 'location', 'output_type_id', 'value'],
                     dtype={'location': str, 'output_type_id': str}, parse_dates=True)
         for f in glob.glob(team_data_source_pattern)), ignore_index=True).replace(' ', '_', regex=True)

    ### Weekly Incidence of Flu Hospitalization Predictions (for main line chart)
    # Retain only predictions for weekly incidence of flu hospitalization.
    predictions = team_data.drop(team_data[team_data.target != 'wk_inc_flu_hosp'].index, inplace=False)

    # Filter for predictions at the desired quantiles.
    predictions.drop(
        predictions[~predictions.output_type_id.isin(['0.025', '0.05', '0.25', '0.5', '0.75', '0.95', '0.975'])].index,
        inplace=True)

    # Remove unneeded column.
    predictions.drop(columns=['target'], inplace=True)

    # Turn quantiles into columns.
    predictions = predictions.pivot_table(values='value', index=['reference_date', 'target_end_date', 'location'],
                                          columns=['output_type_id']).reset_index()

    # Export file.
    predictions.to_csv(predictions_target_path, header=True, index=False, mode='w')

    del predictions

    ### Hospitalization Rate Change Trends (for not-a-pie-chart)
    if team_name in ("MOBS-GLEAM_FLUH", "MIGHTE-Nsemble", "CEPH-Rtrend_fluH", "FluSight-ensemble", "NU_UCSD-GLEAM_AI_FLUH", "MIGHTE-Joint"):
        # Retain only rate change trends.
        trends = team_data.drop(team_data[team_data.target != 'wk_flu_hosp_rate_change'].index, inplace=False)

        # Retain only nowcasts.
        trends.drop(trends[trends.target_end_date != trends.reference_date].index, inplace=True)

        # Drop "large" prefix to enable grouping.
        trends['output_type_id'] = trends.output_type_id.str.removeprefix('large_')

        # Remove unneeded columns.
        trends.drop(columns=['target', 'target_end_date'], inplace=True)

        # Consolidate "increase" and "decrease" values, pivot table for increase/decrease/stable columns.
        trends = trends.groupby(['reference_date', 'location', 'output_type_id'], as_index=False).sum().pivot_table(
            values='value',
            index=['location', 'reference_date'],
            columns=['output_type_id']).reset_index()

        # Export file.
        trends.to_csv(trends_target_path, header=True, index=False, mode='w')

        del trends

    del team_data


# Transform data for all teams.
teams_list = ["MOBS-GLEAM_FLUH", "MIGHTE-Nsemble", "MIGHTE-Joint", "NU_UCSD-GLEAM_AI_FLUH", "CEPH-Rtrend_fluH", "NEU_ISI-FluBcast", "NEU_ISI-AdaptiveEnsemble", "FluSight-ensemble"]
for team in teams_list:
    data_transformation(team)