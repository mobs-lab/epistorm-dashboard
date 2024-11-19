# Model Names Listed Here
team_names=("MOBS-GLEAM_FLUH" "MIGHTE-Nsemble" "NU_UCSD-GLEAM_AI_FLUH" "CEPH-Rtrend_fluH" "FluSight-ensemble")

NEW_FORECAST_FILES_COPIED=false
NEW_SURVEILLANCE_ARCHIVE_COPIED=false

DATA_SOURCE_LOCATION_PATH='FluSight-forecast-hub/model-output'
DATA_TARGET_LOCATION_PATH='public/data/unprocessed'

GROUND_TRUTH_SOURCE='FluSight-forecast-hub/target-data'
GROUND_TRUTH_TARGET='public/data/ground-truth'
GROUND_TRUTH_FILE_NAME='target-hospital-admissions.csv'

#region Check if new model predictions are available, and copy them over if yes
for team in "${team_names[@]}"; do
  echo "Checking for new files from $team..."

# Make sure each model has a subdirectory
  if [ -d "$DATA_SOURCE_LOCATION_PATH/$team" ]; then
    mkdir -p "$DATA_TARGET_LOCATION_PATH/$team"

    # Iterate through all the models on CDC's source
    for file in "$DATA_SOURCE_LOCATION_PATH/$team"/*; do
      filename=$(basename "$file")

      # Check if the file exists in the target directory
      # If not, it is new, so we copy it over
      if [ ! -f "$DATA_TARGET_LOCATION_PATH/$team/$filename" ]; then
        cp "$file" "$DATA_TARGET_LOCATION_PATH/$team/"
        echo "Copied $filename to $DATA_TARGET_LOCATION_PATH/$team/"
        #NOTE: Any new file copied over should trigger a new deployment
        NEW_FORECAST_FILES_COPIED=true
      fi
    done
  else
    echo "Error: team subdirectory does not exist. Please make sure subdirectories are set up."
  fi
  echo
done
#endregion

#region Check if new Surveillance data is available, and copy it over if yes
# Check if target directory is set up for ground truth
if [ ! -d "$GROUND_TRUTH_TARGET" ]; then
    mkdir -p "$GROUND_TRUTH_TARGET"
fi

# NOTE: This set up should only run during initialization of project
if [ ! -f "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME" ]; then
  cp "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"
  echo "Copied target-hospital-admissions.csv to $GROUND_TRUTH_TARGET"
  NEW_FORECAST_FILES_COPIED=true
else
  if ! cmp -s "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"; then
      echo "Detected new version of $GROUND_TRUTH_FILE_NAME in source, merging with stale one..."
      awk '!seen[$0]++' "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME" > "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"
      echo "Merged new entries from $GROUND_TRUTH_FILE_NAME into our $GROUND_TRUTH_TARGET"
      NEW_FORECAST_FILES_COPIED=true
    fi
fi
#endregion

# Echo this for CI/CD pipeline to know that new files are copied.
echo "NEW_FORECAST_FILES_COPIED=$NEW_FORECAST_FILES_COPIED"