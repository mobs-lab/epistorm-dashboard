import React from "react";
import Link from "next/link";

const HomePageWelcome: React.FC = () => {
    return (
        <div
            className="flex flex-col flex-grow w-full min-h-full justify-between"> {/* Full screen height and flex container */}
            <div
                className="flex-grow flex items-center justify-center"> {/* Centering text vertically and horizontally */}
                <p className="text-xl text-center">Welcome to Epistorm Dashboard!</p>
            </div>
            <div className="flex justify-center space-x-4 ">
                <Link href={"/forecasts"}
                      className=" w-1/6 bg-blue-500 hover:bg-blue-700 text-white p-2 font-bold rounded">
                    View Forecasts
                </Link>
                <Link href={"/background"}
                      className="w-1/6 bg-blue-500 hover:bg-blue-700 text-white p-2 font-bold rounded">
                    About us
                </Link>
            </div>
        </div>
    )
};
export default HomePageWelcome;
