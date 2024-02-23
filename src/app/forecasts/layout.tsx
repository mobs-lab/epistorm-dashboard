import React from "react";

export default function ForecastsLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {

    return (
        <section>
            {children}
        </section>


    )
}