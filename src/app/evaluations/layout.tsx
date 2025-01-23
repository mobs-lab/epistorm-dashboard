import React from "react";
import '../CSS/evaluations/evaluations-page-grid.css';

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