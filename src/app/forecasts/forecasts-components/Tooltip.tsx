import React from 'react';

interface TooltipProps {
    content: React.ReactNode;
    x: number;
    y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, x, y }) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '5px',
                borderRadius: '5px',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            {content}
        </div>
    );
};

export default Tooltip;