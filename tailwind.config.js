/** @type {import('tailwindcss').Config} */

const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({

    content: [// Using `src` directory:
        './src/**/*.{js,ts,jsx,tsx,mdx}',],

    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-dm-sans)'],
            }, colors: {
                'mobs-lab-color': '#252a33',
                'mobs-lab-color-filterspane': '#323944',
                'date-picker-accent': '#32bbe0',
                'mobs-lab-separator': '#4e585e',
            },
        },
    },
    plugins: [],
    corePlugins: {
        preflight: true,
    },
})

;

