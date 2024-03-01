import Link from 'next/link';
import React from "react";

interface HeaderProps {
    // Add props if needed in the future
}

const Header: React.FC<HeaderProps> = () => {
    return (
        <>
            <header>
                <div className={"p-4 flex columns-2 space-x-4 justify-between"}>
                    <a href={'..'}><h1 className={"flex-1 flex-nowrap "}> Flu Forecast </h1></a>
                    <nav className={"flex sm; justify-center "}>
                        {[["Home", '..'], ['Forecasts', '../forecasts'], ['Evaluations', '../evaluations'], ['Contact', '../contact'], ['Background', '../background'],].map(([title, url]) => (
                            <Link href={url}
                                  className={"rounded - lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"}>{title}</Link>))}
                    </nav>
                </div>
            </header>
        </>
    )
}
export default Header;
