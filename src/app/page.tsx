import React from "react";
import { Metadata } from "next";
import ForecastPageContents from "@/forecasts/ForecastPageContents";

// Specific metadata for the home page (which is forecasts)
export const metadata: Metadata = {
  title: "Flu Forecasts", // Will become "Flu Forecasts | Epistorm"
  description:
    "Weekly flu predictions and evaluations. US influenza forecasts and surveillance dashboard provided by Epistorm. Flu hospitalization activity levels and rate-trend forecasts.",
  keywords: ["Flu Forecast", "Forecast", "Hospitalization", "Epidemiology", "Rate-trend", "Surveillance", "Dashboard"],
  openGraph: {
    title: "Flu Forecasts | Epistorm",
    description: "Weekly flu predictions and evaluations. US influenza forecasts and surveillance dashboard.",
    url: "https://fluforecast.epistorm.org",
    type: "website",
  },
  alternates: {
    canonical: "https://fluforecast.epistorm.org",
  },
};

export default function HomePage() {
  return <ForecastPageContents />;
}
