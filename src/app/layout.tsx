import React from "react";
import './CSS/globals.css'
import {Metadata} from "next";
import Header from './Components/Header'
import Footer from './Components/Footer'


export const metadata: Metadata = {
    //TODO: metadata
    title: 'Epistorm Dashboard', description: 'Dashboard for visualization of _______ data',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (//TODO: Define how the whole top-level layout should look like.
        // Using Holy Grail layout, header should always be the navigation bar
        // Footer should always be the same as well
        // The main content are dynamic, depending on the route
        <html lang="en" className={"h-full"}>

        <body className={"grid grid-rows-[auto_1fr] min-h-screen bg-gray-100"}>
        <Header/>
        <main className={"p-4"}>
            {children}
        </main>
        <Footer/>
        </body>
        </html>)
}