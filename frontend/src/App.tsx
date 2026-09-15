import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CharacterOverview from './pages/CharacterOverview';
import StoryBooks from './pages/StoryBooks';
import StoryBookDetail from './pages/StoryBookDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/characters" element={<CharacterOverview />} />
        <Route path="/storybooks" element={<StoryBooks />} />
        <Route path="/storybooks/:id" element={<StoryBookDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
