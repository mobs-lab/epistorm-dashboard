NEW_EVALUATION_DATA_COPIED=false

EVALUATION_DATA_SOURCE_LOCATION='epistorm-evaluations/'
EVALUATION_DATA_TARGET_LOCATION='public/data/evaluations-score'

# Create target directory if it doesn't exist
if [ ! -d "$EVALUATION_DATA_TARGET_LOCATION" ]; then
    mkdir -p "$EVALUATION_DATA_TARGET_LOCATION"
fi

# Array of evaluation files to check
evaluation_files=("WIS_ratio.csv" "MAPE.csv")

for file in "${evaluation_files[@]}"; do
    echo "Checking evaluation file: $file..."

    # Check if source file exists
    if [ -f "$EVALUATION_DATA_SOURCE_LOCATION/$file" ]; then
        # If target doesn't exist or is different, copy it
        if [ ! -f "$EVALUATION_DATA_TARGET_LOCATION/$file" ] || \
           ! cmp -s "$EVALUATION_DATA_SOURCE_LOCATION/$file" "$EVALUATION_DATA_TARGET_LOCATION/$file"; then
            cp "$EVALUATION_DATA_SOURCE_LOCATION/$file" "$EVALUATION_DATA_TARGET_LOCATION/$file"
            echo "Copied $file to $EVALUATION_DATA_TARGET_LOCATION/"
            NEW_EVALUATION_DATA_COPIED=true
        fi
    else
        echo "Warning: $file not found in source location"
    fi
done

# Export the environment variable for CI/CD pipeline
echo "NEW_EVALUATION_DATA_COPIED=$NEW_EVALUATION_DATA_COPIED" >> $GITHUB_ENV