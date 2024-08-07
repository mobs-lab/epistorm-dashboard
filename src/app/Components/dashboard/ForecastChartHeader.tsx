import InfoButton from "./InfoButton";
import React from "react";


const ForecastChartHeader: React.FC = () => {


    const chartInfo = (<div>
        <p>
            The solid line represents surveillance data, while the dashed lines show
            predictions from different models.
        </p>
        <p>
            You can hover over the chart to see detailed information for each date.
        </p>
        <p>
            Use the Settings Panel on the right to adjust how you want the chart to display.
        </p>
    </div>);

    return (
        <div className={"w-full h-full flex justify-between"}>
            <div className="flex justify-start items-center">
                <h2 className="mx-5 text-2xl font-bold">Forecast Chart</h2>
                <InfoButton title="Forecast Chart Information" content={chartInfo}/>
            </div>
            <div className={"flex justify-end items-center"}>
                {/*TODO: add a checkbox for toggling on/off the "historical surveillance data viewing mode", which is managed by Redux's filtersSlice to determine whether the chart should now display historical  */}

            </div>
        </div>
    )

}
export default ForecastChartHeader;