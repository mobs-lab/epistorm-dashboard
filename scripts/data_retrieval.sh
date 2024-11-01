team_names=("MOBS-GLEAM_FLUH" "MIGHTE-Nsemble" "NU_UCSD-GLEAM_AI_FLUH" "CEPH-Rtrend_fluH" "FluSight-ensemble")

NEW_FILES_COPIED=false

DATA_SOURCE_LOCATION_PATH='FluSight-forecast-hub/model-output'
DATA_TARGET_LOCATION_PATH='public/data/unprocessed'

GROUND_TRUTH_SOURCE='FluSight-forecast-hub/target-data'
GROUND_TRUTH_TARGET='public/data/ground-truth'
GROUND_TRUTH_FILE_NAME='target-hospital-admissions.csv'

for team in "${team_names[@]}"; do
  echo "Checking for new files from $team..."

  if [ -d "$DATA_SOURCE_LOCATION_PATH/$team" ]; then
    mkdir -p "$DATA_TARGET_LOCATION_PATH/$team"

    for file in "$DATA_SOURCE_LOCATION_PATH/$team"/*; do
      filename=$(basename "$file")

      if [ ! -f "$DATA_TARGET_LOCATION_PATH/$team/$filename" ]; then
        cp "$file" "$DATA_TARGET_LOCATION_PATH/$team/"
        echo "Copied $filename to $DATA_TARGET_LOCATION_PATH/$team/"
        NEW_FILES_COPIED=true
      fi
    done
  else
    echo "Error: team subdirectory does not exist. Please make sure subdirectories are set up."
  fi
  echo
done

if [ ! -d "$GROUND_TRUTH_TARGET" ]; then
    mkdir -p "$GROUND_TRUTH_TARGET"
fi

if [ ! -f "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME" ]; then
  cp "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"
  echo "Copied target-hospital-admissions.csv to $GROUND_TRUTH_TARGET"
  NEW_FILES_COPIED=true
else
  if ! cmp -s "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"; then
    echo "Detected new version of $GROUND_TRUTH_FILE_NAME in source, deleting stale one..."
    rm "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"
    cp "$GROUND_TRUTH_SOURCE/$GROUND_TRUTH_FILE_NAME" "$GROUND_TRUTH_TARGET/$GROUND_TRUTH_FILE_NAME"
    echo "Copied new $GROUND_TRUTH_FILE_NAME to $GROUND_TRUTH_TARGET"
    NEW_FILES_COPIED=true
  fi
fi

echo "NEW_FILES_COPIED=$NEW_FILES_COPIED"