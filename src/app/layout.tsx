// File Path: src/app/layout.tsx
"use client";

import React from "react";

import store from "./store";
import { Provider } from "react-redux";
import { DataProvider } from "./providers/DataProvider";

import Header from "./components/Header";

import "./css/globals.css";
// Importing original styles for react-date-picker from npm
import "react-date-picker/dist/DatePicker.css";
import "react-calendar/dist/Calendar.css";

import { DM_Sans } from "next/font/google";
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={dmSans.className}>
      <body className='flex flex-col min-h-screen bg-mobs-lab-color text-white overflow-clip'>
        <Provider store={store}>
          <DataProvider>
            <Header />
            <main className='box-content flex-grow overflow-scroll util-no-sb-length'>
              <div className='w-full h-full'>{children}</div>
            </main>
          </DataProvider>
        </Provider>
      </body>
    </html>
  );
}
