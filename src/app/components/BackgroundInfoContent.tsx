'use client';

import React, { useEffect, useRef } from 'react';

const BackgroundInfoContent: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadWebflowContent = async () => {
            try {
                const response = await fetch('/BackgroundPage/index.html');
                const html = await response.text();
                if (containerRef.current) {
                    containerRef.current.innerHTML = html;
                }

                // Load Webflow css
                const linkElement = document.createElement('link');
                linkElement.rel = 'stylesheet';
                linkElement.href = '/BackgroundPage/css/epistorm-draft-ffcbb516d1146b52f094f8f5.webflow.css';
                document.head.appendChild(linkElement);

                // Load Webflow JS
                const scriptElement = document.createElement('script');
                scriptElement.src = '/BackgroundPage/js/webflow.js';
                document.body.appendChild(scriptElement);
            } catch (error) {
                console.error('Error loading Webflow content:', error);
            }
        };

        loadWebflowContent();

        // Cleanup function
        return () => {
            const linkElement = document.querySelector('link[href="/BackgroundPage/css/epistorm-draft-ffcbb516d1146b52f094f8f5.webflow.css"]');
            if (linkElement) {
                linkElement.remove();
            }
            const scriptElement = document.querySelector('script[src="/BackgroundPage/js/webflow.js"]');
            if (scriptElement) {
                scriptElement.remove();
            }
        };
    }, []);

    return <div ref={containerRef} />;
};

export default BackgroundInfoContent;