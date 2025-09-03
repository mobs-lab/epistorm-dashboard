// src/app/utils/featureFlags.ts
export type FeatureFlag = "seasonOverviewTab" | string;

/**
 * Utility to check if a feature should be enabled based on environment
 * Note: this implementation stills bundles disabled features, change to conditional imports when needed (though that will depend on Next.js version)
 */
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  // Depends on app.yaml or app.demo.yaml, which are determined by branches + CI/CD pipeline
  const environment = process.env.NEXT_PUBLIC_GAE_SERVICE || "default";

  // Define which features are only available in the demo environment
  const demoOnlyFeatures: FeatureFlag[] = [
    // "seasonOverviewTab",
    /* TODO: Flag the layout change (CSS) for the nowcast widgets */
    // Add more here in the future
  ];

  // For demo-only features, only enable them in the demo environment
  if (demoOnlyFeatures.includes(feature)) {
    return environment == "demo";
  }

  // Default to enabled for any other features
  return true;
};
