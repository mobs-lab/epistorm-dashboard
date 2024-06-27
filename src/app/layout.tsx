'use client'
import React from "react";
import './CSS/globals.css'
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
        <body className="flex flex-col">
        <Header/>
        <main className="p-4 w-full mx-1 h-full">
            <Provider store={store}>{children}</Provider>
        </main>
        </body>
        </html>
    )
}