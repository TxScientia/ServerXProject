import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Residents from './pages/Residents';
import StoryBooks from './pages/StoryBooks';
import StoryBookDetail from './pages/StoryBookDetail';
import PlotSettings from './pages/PlotSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/residents" element={<Residents />} />
        <Route path="/storybooks" element={<StoryBooks />} />
        <Route path="/storybooks/:id" element={<StoryBookDetail />} />
        <Route path="/storybooks/:id/settings" element={<PlotSettings />} />
      </Routes>
    </BrowserRouter>
  );
}
