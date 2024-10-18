import glob
import pandas as pd
import re


def transform_older_data(model_name):
    older_data_files = glob.glob(f"./public/data/archive/{model_name}/*.csv")

    print(f"Files for model {model_name}: {older_data_files}")
    older_data = pd.concat((pd.read_csv(file,
                                        usecols=['forecast_date', 'target', 'target_end_date', 'location', 'type',
                                                 'quantile', 'value'],
                                        dtype={'location': str, 'type': str, 'quantile': str},
                                        parse_dates=['forecast_date', 'target_end_date'])
                            for file in older_data_files), ignore_index=True)

    # Rename columns to match newer data format
    older_data.rename(columns={
        'forecast_date': 'reference_date',
        'type': 'output_type',
        'quantile': 'output_type_id'
    }, inplace=True)  

    # Load locations data and merge with older_data
    locations = pd.read_csv('public/data/locations.csv', dtype={'location': str})
    older_data = pd.merge(older_data, locations[['location', 'location_name']], on='location', how='left')

    # Convert quantile values to float and remove trailing zeros
    def clean_quantile(quantile):
        return float(re.sub(r'\.?0+$', '', f"{float(quantile):.3f}"))

    # Filter for predictions at the desired quantiles
    desired_quantiles = [0.025, 0.05, 0.25, 0.5, 0.75, 0.95, 0.975]
    older_data['output_type_id'] = older_data['output_type_id'].apply(clean_quantile)
    older_data = older_data[older_data['output_type_id'].isin(desired_quantiles)]

    # Remove unneeded columns
    older_data.drop(columns=['target'], inplace=True)

    # Pivot quantiles into columns
    older_data = older_data.pivot_table(values='value',
                                        index=['reference_date', 'target_end_date', 'location', 'location_name'],
                                        columns=['output_type_id']).reset_index()

    
    # For column with header "reference_date", shift all entries' value by 5 days to the future, for example 05/15/2023 becomes 05/20/2023
    older_data['reference_date'] = older_data['reference_date'] + pd.DateOffset(days=5)

    # Export transformed data
    output_path = f"public/data/processed/{model_name}/predictions_older.csv"
    older_data.to_csv(output_path, index=False)


model_names = ["MOBS-GLEAM_FLUH", "MIGHTE-Nsemble",
               "CEPH-Rtrend_fluH", "NU_UCSD-GLEAM_AI_FLUH", "FluSight-ensemble"]
for model in model_names:
    transform_older_data(model)
