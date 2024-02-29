//TODO: The panel with options to filter/change what data to display according to a variety of criteria or Map Selection
// User's selection on this panel should persist even when user decides to browser different forecasts (using tabs on the top of the main dashboard body, below the top navigation bar)

import React from "react";
import Image from 'next/image'

interface FiltersPaneProps {

}

const FiltersPane: React.FC<FiltersPaneProps> = () => {
    return (
        <>
            {/*<h1 className={"bg-blue-700"}> Filters to modify what displays on the chart goes here in the future... </h1>*/}
            {/*<Image src="/Routes.png" width={500} height={500}*/}
            {/*       alt={"picture of directory structure of src folder"}/>*/}

            {/*TODO See Google Doc Mock UP
                A US states map with 3 dropdown menus vertically stacked:
                    - State Selection
                    - Model Selection (using team names)
                    - Dates selection, (see doc for term name)
                ---------------------------------------------------------- line break
                Y-axis scale with radio buttons to choose between Linear or Logarithmic
                ---- less opaque line break
                Confidence Interval:
                    four radio buttons, None, 50%, 90%, 95%
                ---- less opaque line break
                Display Mode:
                    By date or by Horizon, two radio buttons
                ---------------------------------------------------------- line break
                Logo with Text "EPISTORM"
         */}


        </>
    )

}

export default FiltersPane;
