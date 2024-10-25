# epistorm-dashboard

# Access Site Now!

### Deployment on Netlify:

[Epistorm Dashboard On Netlify](https://fluforecast.netlify.app/)

### Deployment on Google Cloud Platform (GCP): 

[Epistorm Dashboard on GCP](https://epistorm-dashboard.uk.r.appspot.com/)

## Requirements:

- Node.js (npm)
- Git

## How to spin up the site locally:

1. Install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) Version 20+
2. Clone the repository to your local machine:

```git clone https://github.com/mobs-lab/epistorm-dashboard.git --recurse-submodules```

_Note_: The `--recurse-submodules` flag is used to clone & update all submodule, which is the FluSight-forecast-hub repository.

3. Go to project root directory and install the dependencies:

```cd epistorm-dashboard```

```npm install```

4. Start the development server:

```npm run dev```

5. Or, Start the server, in production mode, after building the project:

```npm run build && npm run start```

---

### _Update_:
- 2024-10-25:
  - Switched GCP deployment account to use designated service account
  - Flusight-ensemble model added to site
  - Stability upgrade for GitHub Action workflow and Python Script
  - Separation of concerns (tech-stack) begins
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