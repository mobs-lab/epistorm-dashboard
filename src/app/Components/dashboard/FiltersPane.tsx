//TODO: The panel with options to filter/change what data to display according to a variety of criteria or Map Selection
// User's selection on this panel should persist even when user decides to browser different forecasts (using tabs on the top of the main dashboard body, below the top navigation bar)

import React from "react";
import Image from 'next/image'
import {Rubik_Lines} from "next/dist/compiled/@next/font/dist/google";
import {bgBlack} from "next/dist/lib/picocolors";

interface FiltersPaneProps {

}

const FiltersPane: React.FC<FiltersPaneProps> = () => {
    return (
        <>
            <h1 className={"bg-blue-700"}> Filters to modify what displays on the chart goes here in the future... </h1>
            <Image src="/public/Routes.png" width={500} height={500}
                   alt={"picture of directory structure of src folder"}/>
        </>
    )

}

export default FiltersPane;