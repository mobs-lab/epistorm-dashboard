// File Path: src/app/forecasts/layout.tsx
import React from "react";

export default function ForecastsLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {

    return (
        <section className={"w-full h-full"}>
            {children}
        </section>


    )
}