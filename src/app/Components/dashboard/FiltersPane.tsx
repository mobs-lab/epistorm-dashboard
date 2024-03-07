//TODO: The panel with options to filter/change what data to display according to a variety of criteria or Map Selection
// User's selection on this panel should persist even when user decides to browser different forecasts (using tabs on the top of the main dashboard body, below the top navigation bar)

import React from "react";
import StateMap from "./svg/StateMap";

interface FiltersPaneProps {

}

const FiltersPane: React.FC<FiltersPaneProps> = () => {
    return (
        <div className={"bg-blue-700 flex flex-auto flex-col justify-around align-middle w-full h-full"}>
            <StateMap/>
        </div>


    )

}

export default FiltersPane;
