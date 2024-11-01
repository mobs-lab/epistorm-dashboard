# Retrieved from Remy's repo: https://github.com/mobs-lab/flu-dashboard/blob/main/transform_data.py
# Only minor modifications were made to the original code: the file paths were changed to match this project's directory structure.
# 2024-06-13: @Remy Modified from https://github.com/mobs-lab/flu-dashboard/blob/main/transform_data.py

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
        f"*{team_name}.csv"
    )

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
    if team_name in ("MOBS-GLEAM_FLUH", "MIGHTE-Nsemble", "CEPH-Rtrend_fluH", "FluSight-ensemble"):
        # Retain only rate change trends.
        trends = team_data.drop(team_data[team_data.target != 'wk_flu_hosp_rate_change'].index, inplace=False)

        ''' Version for only most recent nowcast
        # Filter for most recent nowcast.
        nowcast_date = max(pd.to_datetime(trends.reference_date.unique(), format='%Y-%m-%d')).strftime('%Y-%m-%d')
        trends.drop(trends[~trends.target_end_date.str.fullmatch(nowcast_date)].index, inplace=True)
        trends.drop(trends[~trends.reference_date.str.fullmatch(nowcast_date)].index, inplace=True)

        # Drop "large" prefix to enable grouping.
        trends['output_type_id'] = trends.output_type_id.str.removeprefix('large_')

        # Remove unneeded columns.
        trends.drop(columns=['reference_date', 'target', 'target_end_date'], inplace=True)

        # Consolidate "increase" and "decrease" values, pivot table for increase/decrease/stable columns.
        trends = trends.groupby(['location', 'output_type_id'], as_index=False).sum().pivot_table(values='value', index=['location'],
                                                                                                  columns=['output_type_id']).reset_index()

        # Insert reference=target date of nowcast.
        trends.insert(loc=0, column='nowcast_date', value=nowcast_date)
        '''

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
teams_list = ["MOBS-GLEAM_FLUH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH", "CEPH-Rtrend_fluH", "FluSight-ensemble"]
for team in teams_list:
    data_transformation(team)

"""
### PREDICTIONS
# Load all CSV files in forecasts folder into a single data frame. Ignore horizon column.
predictions = pd.concat((pd.read_csv(f, usecols=['reference_date','target','target_end_date','location','output_type','output_type_id','value'], parse_dates=True) for f in glob.glob('./data/unprocessed/MOBS-GLEAM_FLUH/*MOBS-GLEAM_FLUH.csv')), ignore_index=True).replace(' ', '_', regex=True)

# Retain only predictions for weekly incidence of flu hospitalization.
predictions.drop(predictions[predictions.target != 'wk_inc_flu_hosp'].index, inplace=True)

# Retain only quantile outputs.
predictions.drop(predictions[predictions.output_type != 'quantile'].index, inplace=True)

# Filter for predictions at the desired quantiles.
predictions.drop(predictions[~predictions.output_type_id.isin(['0.025', '0.25', '0.5', '0.75', '0.975'])].index, inplace=True)

# Remove unneeded columns.
predictions.drop(columns=['target', 'output_type'], inplace=True)

# Turn quantiles into columns.
predictions = predictions.pivot_table(values='value',index=['reference_date','target_end_date','location'],columns=['output_type_id']).reset_index()

# Export file.
predictions.to_csv('./data/processed/MOBS-GLEAM_FLUH/predictions.csv', header=True, index=False, mode='w')

del predictions
"""

### POSTERIORS
# No posteriors from CDC repo, so we'll skip this part for now.
# Load all posteriors, insert dates.
"""
fnames = glob.glob('./data/unprocessed/MOBS-GLEAM_FLUH/*posterior-distributions.csv')
print(fnames) #DEBUG: check if the file paths are correct
dates = [fname.split('_')[0].split('/')[-1] for fname in fnames]

posteriors = pd.concat((pd.read_csv(f, usecols=['location','posterior','bin','count'], dtype={'location': object}).assign(date=d) for f, d in zip(fnames, dates)), ignore_index=True)

# Separate posterior types.
Rt = posteriors.drop(posteriors[posteriors.posterior !='Rt'].index)
RI = posteriors.drop(posteriors[posteriors.posterior !='Residual Immunity'].index)
SSD = posteriors.drop(posteriors[posteriors.posterior !='Simulation Start Date'].index)
del posteriors

# Remove unneeded columns.
Rt.drop(columns='posterior', inplace=True)
RI.drop(columns='posterior', inplace=True)
SSD.drop(columns='posterior', inplace=True)

# Export files.
Rt.to_csv('./data/processed/MOBS-GLEAM_FLUH/posteriors_rt.csv', header=True, index=False, mode='w')
RI.to_csv('./data/processed/MOBS-GLEAM_FLUH/posteriors_ri.csv', header=True, index=False, mode='w')
SSD.to_csv('./data/processed/MOBS-GLEAM_FLUH/posteriors_ssd.csv', header=True, index=False, mode='w')
"""
