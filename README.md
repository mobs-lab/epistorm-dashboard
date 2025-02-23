# epistorm-dashboard

# Link to Deployed Site:

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
