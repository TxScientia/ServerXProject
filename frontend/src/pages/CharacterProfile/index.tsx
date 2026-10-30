import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl, authHeaders } from '../../api';
import { loadFont } from '../../fonts';
import { imageSrc } from '../../images';
import styles from './CharacterProfile.module.css';

type ExpertiseLevel = 'Amateur/Beginner' | 'Intermediate' | 'Expert' | 'Master' | 'Grandmaster' | 'Paragon/One Above All';

type TabBuilderItem =
  | { type: 'headline'; value: string }
  | { type: 'bullet'; size: 'small' | 'large'; values: [string, string] }
  | { type: 'textarea'; size: 'small' | 'large'; value: string }
  | { type: 'image'; size: 'small' | 'large'; url: string }
  | { type: 'textImageText'; title: string; imageUrl: string; text: string }
  | { type: 'skill'; name: string; expertise: ExpertiseLevel };

type EditorData = {
  displayName?: string;
  nameFontFamily?: string;
  nameFontSize?: string;
  quote?: string;
  fullName?: string;
  species?: string;
  specification?: string;
  age?: string;
  sexuality?: string;
  relationshipStatus?: string;
  profession?: string;
  residence?: string;
  origin?: string;
  era?: string;
  biography?: string;
  frameImageUrl?: string;
  portraitImageUrl?: string;
  headerBackgroundUrl?: string;
  ornamentImageUrl?: string;
  customFields?: string[];
  characterTabContent?: TabBuilderItem[];
  abilitiesTabContent?: TabBuilderItem[];
};

type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData?: EditorData;
};

const pairFields = (fields: string[] = []) => {
  const pairs: Array<{ label: string; value: string }> = [];
  for (let index = 0; index < fields.length; index += 2) {
    if (fields[index] || fields[index + 1]) {
      pairs.push({ label: fields[index] || 'Wissenswertes', value: fields[index + 1] || '' });
    }
  }
  return pairs;
};

const hasValue = (value?: string) => Boolean(value && value.trim());

function ProfileSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={styles.sectionBlock}>
      <div className={styles.sectionLabel}>{title}</div>
      {children}
    </section>
  );
}

function renderBuilderItem(item: TabBuilderItem, index: number) {
  if (item.type === 'headline' && hasValue(item.value)) {
    return <h3 key={index} className={styles.builderHeadline}>{item.value}</h3>;
  }

  if (item.type === 'bullet' && (hasValue(item.values[0]) || hasValue(item.values[1]))) {
    return (
      <div key={index} className={item.size === 'large' ? styles.builderFactLarge : styles.builderFact}>
        <h3>{item.values[0]}</h3>
        <p>{item.values[1]}</p>
      </div>
    );
  }

  if (item.type === 'textarea' && hasValue(item.value)) {
    return <p key={index} className={item.size === 'large' ? styles.builderTextLarge : styles.builderText}>{item.value}</p>;
  }

  if (item.type === 'image' && imageSrc(item.url)) {
    return <img key={index} className={item.size === 'large' ? styles.builderImageLarge : styles.builderImage} src={imageSrc(item.url)} alt="Profilbild" />;
  }

  if (item.type === 'skill' && (hasValue(item.name) || hasValue(item.expertise))) {
    return (
      <div key={index} className={styles.builderFact}>
        <h3>{item.name || 'Skill'}</h3>
        <p>{item.expertise}</p>
      </div>
    );
  }

  if (item.type === 'textImageText' && (hasValue(item.title) || imageSrc(item.imageUrl) || hasValue(item.text))) {
    return (
      <div key={index} className={styles.textImageText}>
        <div className={styles.textImageTextLeft}>
          {hasValue(item.title) && <h3>{item.title}</h3>}
          {imageSrc(item.imageUrl) && <img src={imageSrc(item.imageUrl)} alt={item.title || 'Profilbild'} />}
        </div>
        {hasValue(item.text) && <p>{item.text}</p>}
      </div>
    );
  }

  return null;
}

export default function CharacterProfile() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }

    let active = true;
    setCharacter(null);
    setError(null);
    fetch(apiUrl(`/characters/${characterId}`), { headers: { ...authHeaders() } })
      .then((res) => {
        if (res.status === 404) throw new Error('Charakter nicht gefunden.');
        if (!res.ok) throw new Error('Charakterprofil konnte nicht geladen werden.');
        return res.json();
      })
      .then((data: Character) => {
        if (active) setCharacter(data);
      })
      .catch((error: unknown) => {
        if (active) setError(error instanceof Error ? error.message : 'Charakterprofil konnte nicht geladen werden.');
      });
    return () => { active = false; };
  }, [characterId, navigate]);

  const nameFontFamily = character?.editorData?.nameFontFamily?.trim();
  const nameFontSize = Number(character?.editorData?.nameFontSize);

  useEffect(() => {
    if (!nameFontFamily) return;
    // Keep the profile readable with its fallback if the provider is unavailable.
    void loadFont(nameFontFamily).catch(() => {});
  }, [nameFontFamily]);

  if (error) return <div className={styles.status}>{error}</div>;
  if (!character) return <div className={styles.status}>Lade Charakterprofil…</div>;

  const data = character.editorData || {};
  const customPairs = pairFields(data.customFields);
  const displayName = data.displayName || character.name;

  const facts = [
    ['Name', data.fullName || character.name],
    ['Alias', displayName],
    ['Spezies', data.species || character.race],
    ['Spezifikation', data.specification || character.spec],
    ['Alter', data.age || ''],
    ['Geschlecht', character.gender],
    ['Sexualität', data.sexuality || ''],
    ['Beziehungsstand', data.relationshipStatus || ''],
    ['Beruf', data.profession || ''],
    ['Wohnsitz', data.residence || ''],
    ['Herkunft', data.origin || ''],
    ['Zeitalter', data.era || ''],
  ];

  const hasCharacterTab = Boolean(data.characterTabContent?.some((item, index) => renderBuilderItem(item, index)));
  const hasAbilitiesTab = Boolean(data.abilitiesTabContent?.some((item, index) => renderBuilderItem(item, index)));

  return (
    <main className={styles.page}>
      <article className={styles.profileFrame}>
        <nav className={styles.nav} aria-label="Profilnavigation">
          <a href="#steckbrief">Steckbrief</a>
          {hasCharacterTab && <a href="#character">Character</a>}
          {hasAbilitiesTab && <a href="#abilities">Abilities</a>}
          <button type="button">Write PM</button>
        </nav>

        <header id="steckbrief" className={styles.hero} style={imageSrc(data.headerBackgroundUrl) ? {
          backgroundImage: `url(${JSON.stringify(imageSrc(data.headerBackgroundUrl))})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        } : undefined}>
          <div className={styles.heroText}>
            <h1 style={{
              fontFamily: nameFontFamily ? `${JSON.stringify(nameFontFamily)}, var(--font-display)` : undefined,
              fontSize: Number.isFinite(nameFontSize) && nameFontSize >= 8 && nameFontSize <= 200 ? `${nameFontSize}px` : undefined,
            }}>{displayName}</h1>
            <div className={styles.ornament}>
              <span />
              {imageSrc(data.ornamentImageUrl) ? <img src={imageSrc(data.ornamentImageUrl)} alt="" /> : <b>✥</b>}
              <span />
            </div>
            {hasValue(data.quote) && <p className={styles.quote}>{data.quote}</p>}
            {hasValue(data.biography) && <p>{data.biography}</p>}
          </div>
          {imageSrc(data.portraitImageUrl) && (
            <div className={styles.avatarFrame}>
              <img src={imageSrc(data.portraitImageUrl)} alt={`${displayName} Avatar`} />
            </div>
          )}
        </header>

        <ProfileSection id="facts" title="Steckbrief">
          <div className={styles.factGrid}>
            {facts.map(([label, value]) => (
              <div key={label} className={styles.fact}>
                <h2>{label}</h2>
                <p>{value}</p>
              </div>
            ))}
          </div>

          {imageSrc(data.frameImageUrl) && (
            <figure className={styles.bottomImageFigure}>
              <div className={styles.bannerDecoration}>
                <div className={styles.bannerFrame}>
                  <img src={imageSrc(data.frameImageUrl)} alt={`${displayName} Banner`} />
                </div>
              </div>
              {hasValue(data.biography) && <figcaption>“{data.biography}”</figcaption>}
            </figure>
          )}

          {customPairs.length > 0 && (
            <div className={styles.customGrid}>
              {customPairs.map((pair, index) => (
                <div key={`${pair.label}-${index}`} className={styles.fact}>
                  <h2>{pair.label}</h2>
                  <p>{pair.value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>

        {hasCharacterTab && (
          <ProfileSection id="character" title="Character">
            <div className={styles.builderGrid}>{data.characterTabContent?.map(renderBuilderItem)}</div>
          </ProfileSection>
        )}

        {hasAbilitiesTab && (
          <ProfileSection id="abilities" title="Abilities">
            <div className={styles.builderGrid}>{data.abilitiesTabContent?.map(renderBuilderItem)}</div>
          </ProfileSection>
        )}
      </article>
    </main>
  );
}
