import React from "react";

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
        <html lang="en">
        <header>


        </header>
        <body>{children}</body>
        </html>
    )
}