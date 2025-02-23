import React from "react";
import '../css/evaluations/evaluations-page-grid.css';

export default function ContactLayout({
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