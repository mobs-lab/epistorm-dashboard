// components/RiskLevelGauge.tsx

import React from "react";

type RiskLevelGaugeProps = {
    riskLevel: string; // Could be 'minimal', 'low', 'moderate', 'high', 'intense'
};

const RiskLevelGauge: React.FC<RiskLevelGaugeProps> = ({riskLevel}) => {
    return (
        <div className="gauge-container bg-gray-800 text-white p-4 rounded">
            <h3 className="text-lg font-semibold mb-3">Risk level</h3>
            {/* D3.js to render the gauge here */}
            {/* Placeholder div for gauge */}
            <div id="gauge" className="h-24"></div>
        </div>
    );
};

export default RiskLevelGauge;
