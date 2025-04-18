import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="hamburger-container">
        <button className="hamburger" onClick={toggleMenu}>
          &#9776;
        </button>
      </div>
      <div className="brand" onClick={() => navigate("/")}>
        JourneyJoin
      </div>
      <div className="profile-container" onClick={() => navigate("/profile")}>
        <span className="profile-icon">&#128100;</span>
      </div>

      {menuOpen && (
        <div className="side-menu">
          <ul>
            <li onClick={() => handleNavigation("/find-people")}>Find People</li>
            <li onClick={() => handleNavigation("/acs/chat/threads")}>Chat Threads</li>
            <li onClick={() => handleNavigation("/local-guides")}>Local Guides</li>
            <li onClick={() => handleNavigation("/")}>Home</li>
          </ul>
        </div>
      )}
    </header>
  );
}

export default Header;
