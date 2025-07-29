
import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  const activeLinkClass = 'bg-primary text-white';
  const inactiveLinkClass = 'text-gray-600 hover:bg-gray-200 hover:text-gray-800';

  return (
    <header className="bg-white shadow-md w-full sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center p-4">
        <h1 className="text-xl md:text-2xl font-bold text-primary">
          <NavLink to="/">Product Post AI</NavLink>
        </h1>
        <nav className="flex items-center gap-2 md:gap-4">
          <NavLink 
            to="/" 
            className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/generator" 
            className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
          >
            Generator
          </NavLink>
          <NavLink 
            to="/manage" 
            className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
          >
            Manage Posts
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;