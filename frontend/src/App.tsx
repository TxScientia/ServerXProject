import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SESSION_EXPIRED_EVENT } from './api';
import paletteStyles from './assets/styles/CharacterPalette.module.css';
import styles from './App.module.css';
import { WebSocketProvider } from './realtime/WebSocketProvider';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Residents from './pages/Residents';
import StoryBooks from './pages/StoryBooks';
import StoryBookDetail from './pages/StoryBookDetail';
import PlotSettings from './pages/PlotSettings';
import PM from './pages/PM';
import OOCPopup from './pages/OOCPopup';
import NewsPage from './pages/News';
import GuideBook from './pages/GuideBook';
import StoryBookNewsPage from './pages/StoryBookNews';
import GesuchePage from './pages/Gesuche';
import StoryBookGesuchePage from './pages/StoryBookGesuche';
import AdminPage from './pages/Admin';
import SettingsPage from './pages/Settings';
import CharacterEditorPage from './pages/CharacterEditorPage';
import CharacterOverview from './pages/CharacterOverview';
import CharacterProfile from './pages/CharacterProfile';

function PageFrame() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const onSessionExpired = () => navigate('/?session=expired', { replace: true });
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [navigate]);
  const excluded = /^\/characters\/[^/]+\/(editor|profile)\/?$/.test(pathname);
  return (
    <div className={`${styles.frame} ${excluded ? '' : paletteStyles.palette} ${pathname === '/gesuche' ? styles.scrollingFrame : ''}`}>
      <div className={styles.content}><Outlet /></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<PageFrame />}>
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/pm" element={<PM />} />
          <Route path="/ooc" element={<OOCPopup />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/guidebook" element={<GuideBook />} />
          <Route path="/gesuche" element={<GesuchePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/residents" element={<Residents />} />
          <Route path="/storybooks" element={<StoryBooks />} />
          <Route path="/storybooks/:id" element={<StoryBookDetail />} />
          <Route path="/storybooks/:id/news" element={<StoryBookNewsPage />} />
          <Route path="/storybooks/:id/gesuche" element={<StoryBookGesuchePage />} />
          <Route path="/storybooks/:id/settings" element={<PlotSettings />} />
          <Route path="/characters" element={<CharacterOverview />} />
          <Route path="/characters/:characterId/editor" element={<CharacterEditorPage />} />
          <Route path="/characters/:characterId/profile" element={<CharacterProfile />} />
          </Route>
        </Routes>
      </WebSocketProvider>
    </BrowserRouter>
  );
}
