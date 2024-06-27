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
                    'chart-blue': '#2196f3',
                    'chart-purple': '#9c27b0',
                    'chart-green': '#4caf50',
                    'chart-orange': '#ff9800',
                    'date-picker-accent': '#32bbe0',
                }
            },
        }
        ,
        plugins: [],
    }
)

;

