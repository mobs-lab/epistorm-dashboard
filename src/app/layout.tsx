// File Path: src/app/layout.tsx
'use client'

import React from "react";

import Header from './Components/Header';

import {Provider} from 'react-redux';
import store from './store';

import './CSS/globals.css';

// Importing original styles for react-date-picker from npm
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className="flex flex-col h-screen bg-mobs-lab-color text-white">
        <Header/>
        <main className="flex-grow overflow-hidden">
            <div className="w-full h-full">
                <Provider store={store}>{children}</Provider>
            </div>
        </main>
        </body>
        </html>)
}