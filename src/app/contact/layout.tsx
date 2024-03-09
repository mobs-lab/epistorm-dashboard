import React from "react";

export default function ContactLayout({
                                                 children,
                                             }: {
    children: React.ReactNode
}) {
    return (
        <div className={"flex flex-col max-w-4xl mx-auto px-4 py-8"}>
            {children}
        </div>
    )
}