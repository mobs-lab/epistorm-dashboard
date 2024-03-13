import React from "react";

const HomePageWelcome: React.FC = () => {
    return (
        <div className="flex flex-col h-4/5 justify-between"> {/* Full screen height and flex container */}
            <div
                className="flex-grow flex items-center justify-center"> {/* Centering text vertically and horizontally */}
                <p className="text-xl text-center">Welcome to Epistorm Dashboard!</p>
            </div>
            <div className="flex flex-grow flex-col space-x-4 pb-4 px-4">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    View Forecasts
                </button>
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    About us
                </button>
            </div>
        </div>
    )
};
export default HomePageWelcome;
