import React from "react";

export default function BackgroundPageLayout({
                                                 children,
                                             }: {
    children: React.ReactNode
}) {
    return (
        <section>
            <div>
                {children}
            </div>
        </section>
    )
}