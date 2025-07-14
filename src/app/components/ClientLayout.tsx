"use client";

import React from "react";
import { DataProvider } from "@/providers/DataProvider";
import { Provider } from "react-redux";
import store from "@/store/index";
import Header from "./Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <DataProvider>
        <Header />
        <main className="box-content flex-grow overflow-scroll util-no-sb-length">
          <div className="w-full h-full">{children}</div>
        </main>
      </DataProvider>
    </Provider>
  );
}