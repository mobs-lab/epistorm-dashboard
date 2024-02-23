import Link from 'next/link';
import React from "react";

interface HeaderProps {
    // Add props if needed in the future
}

const Header: React.FC<HeaderProps> = () => {
    return (
        <header>
            <nav className={"flex sm; justify-center space-x-4"}>
                {[["Home", '..'], ['Forecasts', '../forecasts'], ['Contact', '../contact'], ['Background', '../background'],].map(([title, url]) => (
                    <Link href={url}
                          className={"rounded - lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"}>{title}</Link>))}
            </nav>
        </header>
    )
}
export default Header;
