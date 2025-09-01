# File: scripts/setup_directories.sh
# For models
mkdir -p data_processing_dir/processed/MOBS-GLEAM_FLUH
mkdir -p data_processing_dir/processed/MIGHTE-Nsemble
mkdir -p data_processing_dir/processed/NU_UCSD-GLEAM_AI_FLUH
mkdir -p data_processing_dir/processed/CEPH-Rtrend_fluH
mkdir -p data_processing_dir/processed/FluSight-ensemble
mkdir -p data_processing_dir/processed/MIGHTE-Joint
mkdir -p data_processing_dir/processed/NEU_ISI-AdaptiveEnsemble
mkdir -p data_processing_dir/processed/NEU_ISI-FluBcast

# For historical ground truth
mkdir -p data_processing_dir/raw/ground-truth/historical-data

# Evaluations Score
mkdir -p data_processing_dir/raw/evaluations-score

# Raw unprocessed prediction data
mkdir -p data_processing_dir/raw/unprocessed

# Staging for ground truth
mkdir -p data_processing_dir/raw/ground-truth/compare