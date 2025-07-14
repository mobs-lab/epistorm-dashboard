import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isDemo = process.env.NEXT_PUBLIC_GAE_SERVICE === "demo";

  if (isDemo) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/private/", "/admin/"],
    },
    sitemap: 'https://fluforecast.epistorm.org/sitemap.xml'
  };
}