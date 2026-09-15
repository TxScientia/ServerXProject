import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import { apiUrl, authHeaders } from '../../api';
import styles from './StoryBookDetail.module.css';

type Place = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  parent_place_id: string | null;
  created_at: string;
};

type Storybook = {
  id: string;
  title: string;
  description: string | null;
  owner_character_id: string;
  created_at: string;
  places: Place[];
};

// Plot-scoped nav items from the wireframe — placeholders until built (own branches).
const PLOT_NAV = ['nav.oocChat', 'nav.news', 'nav.home', 'nav.gesuche', 'nav.mitglieder', 'nav.plotSettings'];

function PlaceNode({
  place,
  allPlaces,
  selectedId,
  onSelect,
}: {
  place: Place;
  allPlaces: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const children = allPlaces.filter((p) => p.parent_place_id === place.id);
  const activeClass = selectedId === place.id ? styles.placeItemActive : '';
  return (
    <li>
      <button
        type="button"
        className={`${styles.placeItem} ${activeClass}`.trim()}
        onClick={() => onSelect(place.id)}
      >
        {place.title}
      </button>
      {children.length > 0 && (
        <ul className={styles.placeChildren}>
          {children.map((child) => (
            <PlaceNode
              key={child.id}
              place={child}
              allPlaces={allPlaces}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function StoryBookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enteredWorld, setEnteredWorld] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const fetchStorybook = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl(`/storybooks/${id}`), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStorybook)
      .catch(() => setError(t('plot.loadError')));
  }, [id, navigate, t]);

  useEffect(() => {
    fetchStorybook();
  }, [fetchStorybook]);

  const places = storybook?.places ?? [];
  const topLevel = places.filter((p) => !p.parent_place_id);
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;

  const enterWorld = () => {
    setEnteredWorld(true);
    setSelectedPlaceId((prev) => prev ?? topLevel[0]?.id ?? null);
  };

  // --- left nav: plot home vs. entered-world (places) ---
  let leftNav;
  if (!storybook) {
    leftNav = (
      <div className={styles.sideNav}>
        <button className={styles.backItem} onClick={() => navigate('/storybooks')}>
          {t('plot.backToStorybooks')}
        </button>
      </div>
    );
  } else if (!enteredWorld) {
    leftNav = (
      <div className={styles.sideNav}>
        <button className={styles.backItem} onClick={() => navigate('/storybooks')}>
          {t('plot.backToStorybooks')}
        </button>
        <div className={styles.sideTitle}>{storybook.title}</div>
        {PLOT_NAV.map((key) => (
          <button key={key} className={styles.sideItem} disabled title={t('common.comingSoon')}>
            {t(key)}
          </button>
        ))}
        <hr className={styles.divider} />
        <button className={styles.enterItem} onClick={enterWorld}>
          {t('plot.enterWorld')}
        </button>
      </div>
    );
  } else {
    leftNav = (
      <div className={styles.sideNav}>
        <button className={styles.backItem} onClick={() => setEnteredWorld(false)}>
          {t('plot.back')}
        </button>
        <div className={styles.sideTitle}>{storybook.title}</div>
        <div className={styles.filterTitle}>{t('plot.places')}</div>
        {topLevel.length === 0 ? (
          <p className={styles.muted}>{t('plot.noPlaces')}</p>
        ) : (
          <ul className={styles.placeTree}>
            {topLevel.map((p) => (
              <PlaceNode
                key={p.id}
                place={p}
                allPlaces={places}
                selectedId={selectedPlaceId}
                onSelect={setSelectedPlaceId}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // --- center ---
  let center;
  if (!storybook) {
    center = <p className={error ? styles.error : undefined}>{error ?? t('common.loading')}</p>;
  } else if (!enteredWorld) {
    // Empty for now — will become the world "biography" (description + image),
    // edited via StoryBook settings (own feature branch).
    center = <p className={styles.muted}>{t('plot.worldBioPlaceholder')}</p>;
  } else if (!selectedPlace) {
    center = <p className={styles.muted}>{t('plot.worldNoPlaces')}</p>;
  } else {
    center = (
      <>
        {selectedPlace.image_url && (
          <img
            className={styles.placeImage}
            src={selectedPlace.image_url}
            alt={selectedPlace.title}
          />
        )}
        <h1 className={styles.title}>{selectedPlace.title}</h1>
        {selectedPlace.description && <p className={styles.desc}>{selectedPlace.description}</p>}
      </>
    );
  }

  return <AppLayout leftNav={leftNav}>{center}</AppLayout>;
}
