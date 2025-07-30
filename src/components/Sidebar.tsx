
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as db from '../services/dbService';

const navLinkClasses = 'flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200';
const activeLinkClasses = 'bg-slate-700 text-white';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleWriteFromScratch = async () => {
    setIsCreating(true);
    try {
        const newPostData = {
            name: `New Draft - ${new Date().toLocaleString()}`,
            title: 'Untitled Post',
            content: '<p>Start writing your masterpiece here...</p>',
            products: [],
            heroImageUrl: '',
            tags: [],
        };
        const response = await db.savePost(newPostData);
        if (response.id) {
            navigate(`/edit/${response.id}`);
        } else {
            throw new Error("Failed to get a new post ID from the server.");
        }
    } catch (e) {
        console.error("Failed to create a post from scratch:", e);
        alert("Could not create a new draft. Please try again.");
    } finally {
        setIsCreating(false);
    }
  };


  return (
    <aside className="w-64 bg-slate-800 p-4 flex-shrink-0 flex flex-col">
      <div className="flex items-center mb-8">
         <div className="p-2 bg-indigo-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
        <h1 className="text-xl font-bold text-white ml-3">BlogGen</h1>
      </div>
      <nav className="flex-grow">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
              Dashboard
            </NavLink>
          </li>
          
          <li className="mt-4 mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Content
          </li>
          <li>
            <NavLink to="/generator" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
              Create with AI
            </NavLink>
          </li>
          <li>
            <button 
              onClick={handleWriteFromScratch} 
              disabled={isCreating}
              className={`${navLinkClasses} w-full text-left`}
            >
              {isCreating ? 'Creating Draft...' : 'Write from Scratch'}
            </button>
          </li>
           <li>
            <NavLink to="/manage" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
              Posts
            </NavLink>
          </li>

          <li className="mt-4 mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Library
          </li>
           <li>
            <NavLink to="/products" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
              Product Library
            </NavLink>
          </li>
          <li>
            <NavLink to="/templates" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
              Prompt Templates
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="text-xs text-slate-500 mt-4">
        <p>&copy; 2024 Product Compare</p>
        <p className="mt-1">Data is stored on the server.</p>
        <p className="mt-2 font-mono">v0.0.3</p>
      </div>
    </aside>
  );
};

export default Sidebar;
