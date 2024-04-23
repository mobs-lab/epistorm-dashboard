/** @type {import('tailwindcss').Config} */

const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
    content: [// Using `src` directory:
        './src/**/*.{js,ts,jsx,tsx,mdx}',], theme: {
        extend: {},
    }, plugins: [],
});

