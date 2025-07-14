// File Path: src/app/forecasts/layout.tsx
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Flu Forecasts",
  description:
    "Weekly flu predictions and evaluations. US influenza forecasts and surveillance dashboard provided by Epistorm. Flu hospitalization activity levels and rate-trend forecasts.",
  keywords: ["Flu Forecast", "Forecast", "Hospitalization", "Epidemiology", "Evaluations", "Forecast Map", "Visualizations"],
  authors: [
    { name: "Jessica Davis", url: "https://www.networkscienceinstitute.org/people/jessica-davis" },
    { name: "Remy LeWinter", url: "https://www.networkscienceinstitute.org/people/remy-lewinter" },
    { name: "Bote Wang", url: "https://porterwang.com" },
  ],
  creator: "MOBs Lab",
  publisher: "MOBs Lab",
};

export default function ForecastsLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
