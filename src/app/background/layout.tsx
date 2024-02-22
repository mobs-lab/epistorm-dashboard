import React from "react";

export default function BackgroundPageLayout({
                                                 children,
                                             }: {
    children: React.ReactNode
}) {
    return (
        <section>
            {children} // For nesting inside the top-level layout
        </section>
        // <html lang="en">
        // <body>{children}</body>
        // </html>
    )
}