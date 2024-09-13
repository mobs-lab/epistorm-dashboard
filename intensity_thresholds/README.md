# Intensity Thresholds

This directory is for generating flu intensity thresholds for use on the activity thermometer within the flu dashboard.

All work and commentary is contained in `intensity_thresholds.Rmd` with the knit report in `intensity_thresholds.html`.

`/renv/` and `renv.lock` are used by the `renv` package to manage the R environment and should bootstrap itself upon opening `epistorm-dashboard.Rproj` in RStudio.

`/memseries/` contains plots used in evaluating MEM data and parameters.

`flusurvnet_data.csv` contains an alternative data source used in exploration.

Final thresholds are generated with HHS data from the main project.