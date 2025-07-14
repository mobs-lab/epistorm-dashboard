import React from "react";
import "../css/evaluations/evaluations-page-grid.css";
import { Metadata } from "next";


export const metadata: Metadata = {
  title: 'Flu Forecast Evaluations',
  description:
    "Weekly flu predictions and evaluations. US influenza model scoring dashboard provided by Epistorm. Season overview and single model evaluations.",
  keywords: ["Flu Forecast", "Forecast", "Hospitalization", "Epidemiology", "Evaluations", "Forecast Map", "Visualizations"],
  authors: [
    { name: "Jessica Davis", url: "https://www.networkscienceinstitute.org/people/jessica-davis" },
    { name: "Remy LeWinter", url: "https://www.networkscienceinstitute.org/people/remy-lewinter" },
    { name: "Bote Wang", url: "https://porterwang.com" },
  ],
  creator: "MOBs Lab",
  publisher: "MOBs Lab",
};

export default function EvaluationsLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
