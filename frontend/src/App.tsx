import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CharacterOverview from './pages/CharacterOverview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/characters" element={<CharacterOverview />} />
      </Routes>
    </BrowserRouter>
  );
}