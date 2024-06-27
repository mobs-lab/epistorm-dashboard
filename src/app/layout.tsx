// src/app/layout.tsx
'use client'
import React from "react";
import './CSS/globals.css'
import 'react-date-picker/dist/DatePicker.css';
import Header from './Components/Header';
import {Provider} from 'react-redux';
import store from './store';


// export const metadata: Metadata = {
//     //TODO: metadata
//     title: 'Epistorm Dashboard', description: '',
// }

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={"flex flex-col h-full bg-mobs-lab-color text-white"}>
        <Header/>
        <main className="flex-grow overflow-hidden p-4 w-full mx-auto h-full">
            <div className="w-full h-full p-4">
                <Provider store={store}>{children}</Provider>
            </div>
        </main>
        </body>
        </html>
    )
}