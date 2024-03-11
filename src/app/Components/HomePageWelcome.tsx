import React from "react";

const HomePageWelcome: React.FC = () => {

    return (
        <div className="flex flex-col h-screen justify-between"> {/* Full screen height and flex container */}
            <div
                className="flex-grow flex items-center justify-center"> {/* Centering text vertically and horizontally */}
                <p className="text-xl text-center">Lorem Ipsum</p> {/* Example text */}
            </div>
            <div className="pb-4 px-4"> {/* Padding bottom and sides */}
                <div className="flex justify-between space-x-4"> {/* Flex container for buttons */}
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Button 1
                    </button>
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Button 2
                    </button>
                </div>
            </div>
        </div>
    )

};

export default HomePageWelcome;
