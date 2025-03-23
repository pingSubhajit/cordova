import React from "react";
import { Outlet } from "react-router-dom";
import "./App.css";

function App(): React.ReactElement {
  return (
    <main className="w-full h-full">
      <Outlet />
    </main>
  );
}

export default App; 