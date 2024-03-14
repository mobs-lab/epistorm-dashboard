import React from "react";
import './CSS/globals.css'
import {Metadata} from "next";
import Header from './Components/Header'


export const metadata: Metadata = {
    //TODO: metadata
    title: 'Epistorm Dashboard', description: '',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (<html lang="en" className={"h-full"}>
    <body className={"grid grid-rows-[auto_1fr] min-h-screen bg-gray-100"}>
    <Header/>
    <main className={"p-4"}>
        {children}
    </main>
    {/*<Footer/>*/}
    </body>
    </html>)
}