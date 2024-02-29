import React from "react";
import './CSS/globals.css'
import {Metadata} from "next";
import Header from './Components/Header'
import Footer from './Components/Footer'


export const metadata: Metadata = {
    //TODO: metadata
    title: 'Epistorm Dashboard',
    description: 'Dashboard for visualization of _______ data',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        //TODO: Define how the whole top-level layout should look like.
        // Using Holy Grail layout, header should always be the navigation bar
        // Footer should always be the same as well
        // The main content are dynamic, depending on the route
        <html lang="en" className={"h-full"} >

        <body className={"h-full"}>
        <div
            className={"h-full flex flex-grow basis-3 columns-3 justify-between flex-col flex-nowrap items-stretch mx-auto px-4 bg-gray-100 font-serif"}>
            <div className={"flex-auto basis-1/5"}>
                <Header/>
            </div>
            <div className={"flex-auto basis-3/5"}>
                {children}
            </div>
            <div className={"flex-auto basis-1/5"}>
                <Footer/>
            </div>
        </div>

        </body>
        </html>
    )
}