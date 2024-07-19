import Link from 'next/link';
import React from "react";

const Header: React.FC = () => {
    return (
        <header className="bg-white text-mobs-lab-color shadow-md">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold">FluForecast</Link>
                <nav className="flex space-x-6">
                    {[['Home', '/'], ['Forecasts', '/forecasts'], ['Evaluations', '/evaluations'], ['Background', '/background'], ['Contact', '/contact']].map(([title, url]) => (
                        <Link key={title} href={url} className="text-mobs-lab-color hover:text-teal-900">{title}</Link>
                    ))}
                </nav>
            </div>
        </header>
    )
}

export default Header;