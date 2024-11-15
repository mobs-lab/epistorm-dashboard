import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    // Get the current service from environment variable
    const isDemo = process.env.NEXT_PUBLIC_GAE_SERVICE === 'demo'

    if (isDemo) {
        // Block all crawling on demo service
        return {
            rules: {
                userAgent: '*',
                disallow: '/'
            }
        }
    }

    // For production service (default), allow crawling with some restrictions
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/private/',
                '/admin/',
            ]
        },
        // sitemap: 'https://epistorm-dashboard.uc.r.appspot.com/sitemap.xml' // Adjust based on your production URL
    }
}