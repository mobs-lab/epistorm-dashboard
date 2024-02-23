//TODO: The panel with options to filter/change what data to display according to a variety of criteria or Map Selection
// User's selection on this panel should persist even when user decides to browser different forecasts (using tabs on the top of the main dashboard body, below the top navigation bar)

import React from "react";
import Image from 'next/image'


interface FiltersPaneProps {

}

const FiltersPane: React.FC<FiltersPaneProps> = () => {
    return (
        <>
            <h1 className={"bg-blue-700"}> Filters to modify what displays on the chart goes here in the future... </h1>
            <Image src="/Routes.png" width={1600} height={1050}
                   alt={"picture of directory structure of src folder"}/>
        </>
    )

}

export default FiltersPane;