# Model Names Listed Here
team_names=("MOBS-GLEAM_FLUH" "MIGHTE-Nsemble" "NU_UCSD-GLEAM_AI_FLUH" "CEPH-Rtrend_fluH" "FluSight-ensemble")

NEW_PREDICTION_DATA_COPIED=false
NEW_SURVEILLANCE_DATA_COPIED=false
NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED=false

PREDICTION_DATA_SOURCE_LOCATION='FluSight-forecast-hub/model-output'
PREDICTION_DATA_TARGET_LOCATION='public/data/unprocessed'

SURVEILLANCE_DATA_SOURCE_LOCATION='FluSight-forecast-hub/target-data'
SURVEILLANCE_DATA_TARGET_LOCATION='public/data/ground-truth'
SURVEILLANCE_DATA_FILE_NAME='target-hospital-admissions.csv'

SURVEILLANCE_ARCHIVE_DATA_SOURCE_LOCATION='auxiliary-data/target-data-archive'
SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION='public/data/ground-truth/historical-data'

#region Check if new model predictions are available, and copy them over if yes
for team in "${team_names[@]}"; do
  echo "Checking for new files from $team..."

# Make sure each model has a subdirectory
  if [ -d "$PREDICTION_DATA_SOURCE_LOCATION/$team" ]; then
    mkdir -p "$PREDICTION_DATA_TARGET_LOCATION/$team"

    # Iterate through all the models on CDC's source
    for file in "$PREDICTION_DATA_SOURCE_LOCATION/$team"/*; do
      filename=$(basename "$file")

      # Check if the file exists in the target directory
      # If not, it is new, so we copy it over
      if [ ! -f "$PREDICTION_DATA_TARGET_LOCATION/$team/$filename" ]; then
        cp "$file" "$PREDICTION_DATA_TARGET_LOCATION/$team/"
        echo "Copied $filename to $PREDICTION_DATA_TARGET_LOCATION/$team/"
        #NOTE: Any new file copied over should trigger a new deployment
        NEW_PREDICTION_DATA_COPIED=true
      fi
    done
  else
    echo "Error: team subdirectory does not exist. Please make sure subdirectories are set up."
  fi
  echo
done
#endregion

#region Check if new Surveillance data is available, and copy it over if yes
# Duplicate: Check if target directory is set up for ground truth
if [ ! -d "$SURVEILLANCE_DATA_TARGET_LOCATION" ]; then
    mkdir -p "$SURVEILLANCE_DATA_TARGET_LOCATION"
fi

# NOTE: This set up should only run during initialization of project
if [ ! -f "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" ]; then
  cp "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME"
  echo "Copied target-hospital-admissions.csv to $SURVEILLANCE_DATA_TARGET_LOCATION"
  NEW_SURVEILLANCE_DATA_COPIED=true
else
  if ! cmp -s "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME"; then
      echo "Detected new version of $SURVEILLANCE_DATA_FILE_NAME in source, merging with stale one..."
      awk '!seen[$0]++' "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" > "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME"
      echo "Merged new entries from $SURVEILLANCE_DATA_FILE_NAME into our $SURVEILLANCE_DATA_TARGET_LOCATION"
      NEW_SURVEILLANCE_DATA_COPIED=true
    fi
fi
#endregion

#region Check if new Surveillance Archive data is available, and copy it over if yes
# Duplicate: Check if target directory is set up for historical data
if [ ! -d "$SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION" ]; then
    mkdir -p "$SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION"
fi

# check if new files are available in the source directory for historical archive data
for file in "$SURVEILLANCE_ARCHIVE_DATA_SOURCE_LOCATION"/*; do
  filename=$(basename "$file")

  # Check if the file exists in the target directory
  # If not, it is new, so we copy it over
  if [ ! -f "$SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION/$filename" ]; then
    cp "$file" "$SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION/"
    echo "Copied $filename to $SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION/"
    NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED=true
  fi
done
#endregion

# Export the environment variables to be used by the CI/CD Pipeline
{
    echo "NEW_PREDICTION_DATA_COPIED=$NEW_PREDICTION_DATA_COPIED"
    echo "NEW_SURVEILLANCE_DATA_COPIED=$NEW_SURVEILLANCE_DATA_COPIED"
    echo "NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED=$NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED"
} >> $GITHUB_ENV