# Retrieved from Remy's repo: https://github.com/mobs-lab/flu-dashboard/blob/main/transform_data.py
# Only minor modifications were made to the original code: the file paths were changed to match this project's directory structure.

import numpy as np
import pandas as pd
import glob


def data_transformation(team_name):
    """
    Function to transform the data from the different teams into their own separate single file.

    Args:
    team_name: str, name of the team

    Returns:
    df: pd.DataFrame, transformed data
    """

    team_data_source_location = "./public/data/unprocessed/" + team_name + "/*" + team_name + ".csv"
    team_data_target_location = "./public/data/processed/" + team_name + "/" + "predictions.csv"

    print(team_data_source_location)
    print(team_data_target_location)
    ### PREDICTIONS
    # Load all CSV files in forecasts folder into a single data frame. Ignore horizon column.
    predictions = pd.concat((pd.read_csv(f, usecols=['reference_date', 'target', 'target_end_date', 'location',
                                                     'output_type', 'output_type_id', 'value'], parse_dates=True) for f
                             in glob.glob(team_data_source_location)), ignore_index=True).replace(' ', '_', regex=True)

    # Retain only predictions for weekly incidence of flu hospitalization.
    predictions.drop(predictions[predictions.target != 'wk_inc_flu_hosp'].index, inplace=True)

    # Retain only quantile outputs.
    predictions.drop(predictions[predictions.output_type != 'quantile'].index, inplace=True)

    # Filter for predictions at the desired quantiles.
    predictions.drop(predictions[~predictions.output_type_id.isin(['0.025', '0.05', '0.25', '0.5', '0.75', '0.95','0.975'])].index,
                     inplace=True)

    # Remove unneeded columns.
    predictions.drop(columns=['target', 'output_type'], inplace=True)

    # Turn quantiles into columns.
    predictions = predictions.pivot_table(values='value', index=['reference_date', 'target_end_date', 'location'],
                                          columns=['output_type_id']).reset_index()

    # Export file.
    predictions.to_csv(team_data_target_location, header=True, index=False, mode='w')

    del predictions


# Now we use data_transformation function on all the teams
teams_list = ["MOBS-GLEAM_FLUH", "MIGHTE-Nsemble", "NU_UCSD-GLEAM_AI_FLUH", "CEPH-Rtrend_fluH"]

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
