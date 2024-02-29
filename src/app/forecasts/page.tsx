import FiltersPane from '../Components/dashboard/FiltersPane';
import ForecastChart from '../Components/dashboard/ForecastChart';
import SettingsPane from '../Components/dashboard/SettingsPane';


export default function Page() {

    return (<div className={"flex flex-row px-2 flex-nowrap"}>

        <div className={"flex-auto basis-4/5"}>

            <ForecastChart/>
        </div>
        <div className={"flex-none basis-1/5"}>
            <FiltersPane/>
        </div>
        <div className={"hidden"}>
            <SettingsPane/>
        </div>
    </div>)
};