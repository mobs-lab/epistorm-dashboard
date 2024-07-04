// src/app/layout.tsx
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
    return (<html lang="en">
    <body className={"flex flex-col h-full bg-mobs-lab-color text-white"}>
    <Header/>
    <main className="flex-grow overflow-hidden p-4 w-full mx-auto h-full">
        <div className="w-full h-full p-4">
            <Provider store={store}>{children}</Provider>
        </div>
    </main>
    </body>
    </html>)
}