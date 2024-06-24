/** @type {import('tailwindcss').Config} */

const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({

        content: [// Using `src` directory:
            './src/**/*.{js,ts,jsx,tsx,mdx}',],

        theme: {
            extend: {
                colors:{
                    'mobs-lab-color': '#00505b',
                    'mobs-lab-color-filterspane': '#005e6d',
                }
            },
        }
        ,
        plugins: [],
    }
)

;

