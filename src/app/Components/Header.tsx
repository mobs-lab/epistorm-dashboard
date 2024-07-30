import Link from 'next/link';
import React from "react";

const Header: React.FC = () => {
    return (
        <header className="bg-white text-mobs-lab-color shadow-md w-full">
            <div className="container mx-auto min-w-[100vw] px-4 py-3 flex w-full justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="text-2xl font-bold mr-6">FluForecast</Link>
                </div>
                <nav className="flex space-x-6">
                    <Link href="/" className="text-mobs-lab-color hover:text-teal-900">Home</Link>
                    <Link href="/forecasts/" className="text-mobs-lab-color hover:text-teal-900">Forecasts</Link>
                    <Link href="/evaluations/" className="text-mobs-lab-color hover:text-teal-900">Evaluations</Link>
                    <Link href="/background/" className="text-mobs-lab-color hover:text-teal-900">Background</Link>
                    <Link href="/contact/" className="text-mobs-lab-color hover:text-teal-900">Contact</Link>
                </nav>
            </div>
        </header>
    )
}

export default Header;