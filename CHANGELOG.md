
### _Updates_:
- 2025-02-23: Evaluations Single-Model Page constructed
- 2025-01-16: Pipeline extended to accomodate for model evaluations
- 2024 Nov – 2025 Jan: Code Cleanup, CSS updates and integration with new deployment workflow, new models added, experimental branch established, 
- 2024-10-25:
  - Switched GCP deployment account to use designated service account
  - Flusight-ensemble model added to site
  - Stability upgrade for GitHub Action workflow and Python Script
  - ~~Separation of concerns begins~~ (Edit: 2025-02-23)
- 2024-10-18: Deployed to GCP using default service account; various bug fixes
- 2024-10-11: 
  - Bug fixes for Nowcast-statemap-thermometer widget, update to responsiveness of all components;
  - Fixed season generation
- 2024-10-04: Improved chart logic handling, updated Redux handling of seasons and dates
- 2024-10-03: Fixed settings panel date picker bug, updated epistorm logo handling
- 2024-09-27: Improved not-a-pie-chart handling
- 2024-09-20: General CSS Update
- 2024-08-27: Update to forecast chart y-axis handling, ticks display and responsiveness
- 2024-08-20: Initial Deployment to Netlify
- 2024-07-30: Initial fix to various css issues
- 2024-07-19:
  - Removed Puerto Rico Data
  - Added Legend items to Nowcast visualizations
  - Update to all texts on site
  - Update to font size on site
  - First draft of JS-based re-sizing of components
- 2024-07-08: Layout Change and improvements to chart, settings, and map components; Added requirement for nowcast data visualization; Documentation structure update.
- 2024-05-22: Updated README.md with instructions on how to run/dev project locally.
- 2024-05-19:
  - **Line Chart Functionality Finished**, ready to move onto CSS update.
  - Added comments for SettingsPanel, ForecastChart, and StateMap.
- 2024-04-25: Finished line chart update and introduced **material-tailwind** lib for date picker in settings panel.
  - Also merged back y-axis log scale and ticks update.
- 2024-04-08: Moving onto finish up functionalities of line chart, focusing on interactivity and Settings panel correcly
  display; plus state map display update needed
- 2024-03-21: Refactorization ongoing for page-chart-settings so they interact better, leave potential to implement
  state management library like redux or better
- 2024-03-10: Added Landing Page; Placeholder Components; Fixed mysterious team name bug
- 2024-03-09: Refined layout and routing structures, finished importing US state map, interactivity next
- 2024-02-14: Finished Data Retrieval and Data Processing workflows, added in git submodule (cdcepi's
  FluSight-forecast-hub)
- 2024-02-14: For retrieving data, added in git submodule and updated workflows
- 2024-02-12: preparation branch for setting up ignore and workflow placeholders, for other branches