"use client";
import Link from "next/link";
import React, { useEffect, useRef } from "react";

const Header: React.FC = () => {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);

  return (
    <header ref={headerRef} className='bg-white text-mobs-lab-color shadow-md w-full'>
      <div className='container min-w-[100vw] px-4 py-3 flex w-full justify-between items-center max-h-[8vh]'>
        <div className='flex items-center'>
          <Link href='/' className='text-5xl font-bold mr-6 ml-4'>
            Flu<span className={"font-light text-5xl"}>Forecast</span>
          </Link>
        </div>
        <nav className='flex space-x-6 pr-4'>
          <Link href={"https://www.epistorm.org/flu-forecast-about"} className='text-2xl text-mobs-lab-color hover:text-teal-900' target="_blank">
            About
          </Link>
          <Link href='/' className='text-2xl text-mobs-lab-color hover:text-teal-900'>
            Forecasts
          </Link>
          <Link href='/evaluations/' className='text-2xl text-mobs-lab-color hover:text-teal-900'>
            Evaluations
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
