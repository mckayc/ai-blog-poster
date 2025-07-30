
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Generator from './pages/Generator.tsx';
import ManagePosts from './pages/ManagePosts.tsx';
import Templates from './pages/Templates.tsx';
import EditPost from './pages/EditPost.tsx';
import ManageProducts from './pages/ManageProducts.tsx';

const App: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/manage" element={<ManagePosts />} />
            <Route path="/edit/:postId" element={<EditPost />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/products" element={<ManageProducts />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;