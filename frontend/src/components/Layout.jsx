// components/Layout.jsx
import React from "react";
import Header from "./Header";
import { Outlet } from "react-router-dom";
//import "../styles/Layout.css"; // optional styling for layout

function Layout() {
  return (
    <div className="layout-container">
      <Header />
      <div className="content-container">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
