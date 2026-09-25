import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import Badge from '../../components/Badge/Badge';
import Scene from '../../components/Scene';
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
  biography: string | null;
  owner_character_id: string;
  created_at: string;
  places: Place[];
};

type LinkedSpace = {
  id: string;
  title: string;
  description: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enteredWorld, setEnteredWorld] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [linkedSpaces, setLinkedSpaces] = useState<LinkedSpace[]>([]);
  const [plotNewsUnread, setPlotNewsUnread] = useState(0);

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

  const fetchPlotNewsUnread = useCallback(() => {
    if (!id || !localStorage.getItem('token')) return;
    fetch(apiUrl(`/storybooks/${id}/news/unread-count`), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPlotNewsUnread(data?.count ?? 0))
      .catch(() => setPlotNewsUnread(0));
  }, [id]);

  const fetchLinkedPlots = useCallback(() => {
    if (!id) return;
    fetch(apiUrl(`/storybooks/${id}/linked-plots`), {
      headers: { ...authHeaders(), 'X-Character-Id': localStorage.getItem('characterId') || '' },
    })
      .then((res) => (res.ok ? res.json() : { linked_spaces: [] }))
      .then((data: { linked_spaces: LinkedSpace[] }) => setLinkedSpaces(data.linked_spaces ?? []))
      .catch(() => setLinkedSpaces([]));
  }, [id]);

  useEffect(() => {
    fetchStorybook();
    fetchPlotNewsUnread();
  }, [fetchStorybook, fetchPlotNewsUnread]);

  const places = storybook?.places ?? [];
  const topLevel = places.filter((p) => !p.parent_place_id);
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;
  // Phase 1: only the owner (creator) can open Plot Settings. Editors arrive with Phase 2.
  const canEditSettings =
    storybook != null && localStorage.getItem('characterId') === storybook.owner_character_id;

  const enterWorld = useCallback(() => {
    setEnteredWorld(true);
    setSelectedPlaceId((prev) => prev ?? topLevel[0]?.id ?? null);
    fetchLinkedPlots();
  }, [topLevel, fetchLinkedPlots]);

  // Auto-enter the world when arriving via a linked-plot jump (?enter=1).
  useEffect(() => {
    if (storybook && searchParams.get('enter') === '1' && !enteredWorld) {
      enterWorld();
      searchParams.delete('enter');
      setSearchParams(searchParams, { replace: true });
    }
  }, [storybook, searchParams, enteredWorld, enterWorld, setSearchParams]);

  const goToLinkedPlot = (linkedId: string) => {
    // Reset local state and jump straight into the linked world's place tree.
    setEnteredWorld(false);
    setSelectedPlaceId(null);
    navigate(`/storybooks/${linkedId}?enter=1`);
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
        {PLOT_NAV.map((key) => {
          if (key === 'nav.plotSettings') {
            if (!canEditSettings) return null;

            return (
              <button
                key={key}
                className={styles.sideItem}
                onClick={() => navigate(`/storybooks/${storybook!.id}/settings`)}
              >
                {t(key)}
              </button>
            );
          }

          if (key === 'nav.news') {
            return (
              <div key={key} className={styles.sideItemWrapper}>
                <button className={styles.sideItem} onClick={() => navigate(`/storybooks/${storybook!.id}/news`)}>
                  {t(key)}
                </button>
                <Badge count={plotNewsUnread} variant="nav" />
              </div>
            );
          }

          return (
            <button key={key} className={styles.sideItem} disabled title={t('common.comingSoon')}>
              {t(key)}
            </button>
          );
        })}
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
        {linkedSpaces.length > 0 && (
          <>
            <hr className={styles.divider} />
            <div className={styles.filterTitle}>{t('plot.linkedWorlds')}</div>
            {linkedSpaces.map((s) => (
              <button
                key={s.id}
                className={styles.sideItem}
                onClick={() => goToLinkedPlot(s.id)}
              >
                {s.title}
              </button>
            ))}
          </>
        )}
      </div>
    );
  }

  // --- center ---
  let center;
  if (!storybook) {
    center = <p className={error ? styles.error : undefined}>{error ?? t('common.loading')}</p>;
  } else if (!enteredWorld) {
    // World "biography" (edited via Plot Settings). Plain text for now; BBCode later.
    center = storybook.biography ? (
      <div className={styles.biography}>{storybook.biography}</div>
    ) : (
      <p className={styles.muted}>{t('plot.worldBioPlaceholder')}</p>
    );
  } else if (!selectedPlace) {
    center = <p className={styles.muted}>{t('plot.worldNoPlaces')}</p>;
  } else {
    center = (
      <>
        <div className={styles.placeHeader}>
          {selectedPlace.image_url && (
            <img
              className={styles.placeImage}
              src={selectedPlace.image_url}
              alt={selectedPlace.title}
            />
          )}
          <h1 className={styles.title}>{selectedPlace.title}</h1>
          {selectedPlace.description && <p className={styles.desc}>{selectedPlace.description}</p>}
        </div>
        <Scene storybookId={storybook.id} placeId={selectedPlace.id} canModerate={canEditSettings} />
      </>
    );
  }

  return <AppLayout leftNav={leftNav}>{center}</AppLayout>;
}
