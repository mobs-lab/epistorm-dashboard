"use client";

import React, { useState, useEffect } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optionally show a spinner or skeleton while loading
}

export const ClientOnly: React.FC<ClientOnlyProps> = ({ children, fallback = null }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};