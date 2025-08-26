// File Path: src/app/layout.tsx
import React from "react";

import "./css/globals.css";
import { DM_Sans } from "next/font/google";
import { Metadata } from "next";

// Importing original styles for react-date-picker from npm
import "react-date-picker/dist/DatePicker.css";
import "react-calendar/dist/Calendar.css";

import ClientLayout from "@/shared-components/ClientLayout";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

/* Root Metadata generation with template */
export const metadata: Metadata = {
  title: { template: "%s | Epistorm", default: "Epistorm" },
  description:
    "Weekly flu predictions and evaluations. US influenza forecasts and surveillance dashboard provided by Epistorm. Flu hospitalization activity levels and rate-trend forecasts.",
  keywords: ["Flu Forecast", "Forecast", "Hospitalization", "Epidemiology"],
  authors: [
    { name: "Jessica Davis", url: "https://www.networkscienceinstitute.org/people/jessica-davis" },
    { name: "Remy LeWinter", url: "https://www.networkscienceinstitute.org/people/remy-lewinter" },
    { name: "Bote Wang", url: "https://porterwang.com" },
  ],
  creator: "MOBs Lab",
  publisher: "MOBs Lab",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  /* TODO: Add in the future */
  /* openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fluforecast.epistorm.org',
    title: 'Epistorm - Flu Forecast Dashboard',
    description: 'Weekly flu predictions and evaluations. US influenza forecasts and surveillance dashboard provided by Epistorm.',
    siteName: 'Epistorm',
    images: [
      {
        url: 'https://fluforecast.epistorm.org/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Epistorm Flu Forecast Dashboard',
      },
    ],
  }, */
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={dmSans.className}>
      <body className='flex flex-col min-h-screen bg-mobs-lab-color text-white overflow-clip'>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
