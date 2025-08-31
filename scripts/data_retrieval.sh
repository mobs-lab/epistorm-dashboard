# Model Names Listed Here
team_names=("MOBS-GLEAM_FLUH" "MIGHTE-Nsemble" "MIGHTE-Joint" "NU_UCSD-GLEAM_AI_FLUH" "CEPH-Rtrend_fluH" "NEU_ISI-FluBcast" "NEU_ISI-AdaptiveEnsemble" "FluSight-ensemble")

NEW_PREDICTION_DATA_COPIED=false
NEW_SURVEILLANCE_DATA_COPIED=false
NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED=false
NEW_EVALUATIONS_DATA_COPIED=false

PREDICTION_DATA_SOURCE_LOCATION='FluSight-forecast-hub/model-output'
PREDICTION_DATA_TARGET_LOCATION='data_processing_dir/raw/unprocessed'

SURVEILLANCE_DATA_SOURCE_LOCATION='FluSight-forecast-hub/target-data'
SURVEILLANCE_DATA_TARGET_LOCATION='data_processing_dir/raw/ground-truth/compare' #NOTE: Added "compare" so this script does not compare new ones with cleaned up ones (which will always be different)
SURVEILLANCE_DATA_FILE_NAME='target-hospital-admissions.csv'

SURVEILLANCE_ARCHIVE_DATA_SOURCE_LOCATION='FluSight-forecast-hub/auxiliary-data/target-data-archive'
SURVEILLANCE_ARCHIVE_DATA_TARGET_LOCATION='data_processing_dir/raw/ground-truth/historical-data'

EVALUATION_DATA_SOURCE_LOCATION='epistorm-evaluations/evaluations'
EVALUATION_DATA_TARGET_LOCATION='data_processing_dir/raw/evaluations-score'

# Function to get the most recent files in a directory
get_most_recent_files() {
    local dir="$1"
    local pattern="$2"
    # Find files matching the pattern, sort by modification time (newest first), and return the first 20
    find "$dir" -type f -name "$pattern" -printf "%T@ %p\n" | sort -nr | cut -d' ' -f2- | head -n 20
}

# Function to compare files and copy if they differ, or if the prediction file is new
copy_new_changed() {
  local source_file="$1" # Source files within the submodule
  local target_file="$2" # Synonymous files stored in our local public/data folder, for comparison

    if [ ! -f "$target_file" ] || ! cmp -s "$source_file" "$target_file"; then
      cp "$source_file" "$target_file"
      echo "Copied $(basename "$source_file") to $target_file"
      return 0  # File was copied
    else
      return 1  # File was not copied
    fi
}

#region Check if new model predictions are available, and copy them over if yes
for team in "${team_names[@]}"; do
  echo "Checking for new files from $team..."

# Make sure each model has a subdirectory
  if [ -d "$PREDICTION_DATA_SOURCE_LOCATION/$team" ]; then
    mkdir -p "$PREDICTION_DATA_TARGET_LOCATION/$team"

    # File extensions patterns to look for
    file_patterns=("*.csv" "*.gz" "*.zip" "*.csv.zip" "*.csv.gz" "*.parquet" "*.pq")

    for pattern in "${file_patterns[@]}"; do
      # Get the most recent files in the source directory
      most_recent_files=$(get_most_recent_files "$PREDICTION_DATA_SOURCE_LOCATION/$team" "$pattern")

      for file in $most_recent_files; do
        filename=$(basename "$file")
        target_file="$PREDICTION_DATA_TARGET_LOCATION/$team/$filename"

        # Check if the file is new or has changed
        if copy_new_changed "$file" "$target_file"; then
          #NOTE: Any new file copied over should trigger a new deployment
          NEW_PREDICTION_DATA_COPIED=true
        fi
      done
    done
  else
    # In case the directories are deleted somehow
    echo "Error: team subdirectory does not exist. Please make sure subdirectories are set up."
  fi
    echo "------------------------------"
done
#endregion

#region Check if new Surveillance data is available, and copy it over if yes
# Duplicate: Check if target directory is set up for ground truth
if [ ! -d "$SURVEILLANCE_DATA_TARGET_LOCATION" ]; then
    mkdir -p "$SURVEILLANCE_DATA_TARGET_LOCATION"
fi

# NOTE: This set up should only run during initialization of project
if [ ! -f "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" ]; then
  echo "Missing required surveillance data file, copying newest one over..."
  cp "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME"
  echo "Copied target-hospital-admissions.csv to $SURVEILLANCE_DATA_TARGET_LOCATION"
  NEW_SURVEILLANCE_DATA_COPIED=true
else
  if ! cmp -s "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME"; then
    echo "Detected new version of $SURVEILLANCE_DATA_FILE_NAME in source, copying into compare area..."
    rm "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" # Remove the old file
    cp "$SURVEILLANCE_DATA_SOURCE_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" "$SURVEILLANCE_DATA_TARGET_LOCATION/$SURVEILLANCE_DATA_FILE_NAME" # Copy the new file over
    echo "Copied $SURVEILLANCE_DATA_FILE_NAME into our $SURVEILLANCE_DATA_TARGET_LOCATION, awaiting cleanup of NA rows..."
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

#region Check if new evaluations data is available, and copy over if yes
if [ ! -d "$EVALUATION_DATA_TARGET_LOCATION" ]; then
    mkdir -p "$EVALUATION_DATA_TARGET_LOCATION"
fi

# Evaluation files to check
evaluation_files=("WIS_ratio.csv" "MAPE.csv" "coverage.csv")

for file in "${evaluation_files[@]}"; do
    echo "Checking evaluation file: $file..."

    # Check if source file exists
    if [ -f "$EVALUATION_DATA_SOURCE_LOCATION/$file" ]; then
        # If target doesn't exist or is different, copy it
        if [ ! -f "$EVALUATION_DATA_TARGET_LOCATION/$file" ] || \
           ! cmp -s "$EVALUATION_DATA_SOURCE_LOCATION/$file" "$EVALUATION_DATA_TARGET_LOCATION/$file"; then
            cp "$EVALUATION_DATA_SOURCE_LOCATION/$file" "$EVALUATION_DATA_TARGET_LOCATION/$file"
            echo "Copied $file to $EVALUATION_DATA_TARGET_LOCATION/"
            NEW_EVALUATIONS_DATA_COPIED=true
        fi
    else
        echo "Warning: $file not found in source location"
    fi
done
#endregion

# Export the environment variables to be used by the CI/CD Pipeline
{
  echo "NEW_PREDICTION_DATA_COPIED=$NEW_PREDICTION_DATA_COPIED"
  echo "NEW_SURVEILLANCE_DATA_COPIED=$NEW_SURVEILLANCE_DATA_COPIED"
  echo "NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED=$NEW_SURVEILLANCE_ARCHIVE_DATA_COPIED"
  echo "NEW_EVALUATIONS_DATA_COPIED=$NEW_EVALUATIONS_DATA_COPIED"
} >> $GITHUB_ENV