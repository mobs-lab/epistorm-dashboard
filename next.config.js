// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */

    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },


    webpack: (config) => {
        config.module.rules.push({
            test: /\.html$/, use: 'raw-loader',
        });
        return config;
    }
}

module.exports = nextConfig