
import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import Manage from './pages/Manage';
import { AppProvider } from './contexts/AppContext';

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col font-sans">
          <Header />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/generator" element={<Generator />} />
              <Route path="/manage" element={<Manage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AppProvider>
  );
}

export default App;