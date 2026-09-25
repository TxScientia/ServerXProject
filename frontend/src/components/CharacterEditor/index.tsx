import React, { useMemo, useState } from 'react';
import styles from './CharacterEditor.module.css';

export type CharacterEditorData = {
  displayName: string;
  fullName: string;
  species: string;
  specification: string;
  age: string;
  sexuality: string;
  relationshipStatus: string;
  profession: string;
  residence: string;
  origin: string;
  era: string;
  biography: string;
  imageSettings: string;
  frameImageUrl: string;
  portraitImageUrl: string;
  headerBackgroundUrl: string;
  colorCodes: string;
  characterText: string;
  abilities: string;
  customFields: string[];
};

export type EditableCharacter = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData?: Partial<CharacterEditorData>;
};

export type CharacterForm = {
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData: CharacterEditorData;
};

type EditorSection = 'charId' | 'biography' | 'imageSettings' | 'colorCodes';
type EditorTab = 'charId' | 'character' | 'abilities';
type BuilderTab = Exclude<EditorTab, 'charId'>;

type ExpertiseLevel = 'Amateur/Beginner' | 'Intermediate' | 'Expert' | 'Master' | 'Grandmaster' | 'Paragon/One Above All';

type TabBuilderItem =
  | { type: 'headline'; value: string }
  | { type: 'bullet'; size: 'small' | 'large'; values: [string, string] }
  | { type: 'textarea'; size: 'small' | 'large'; value: string }
  | { type: 'image'; size: 'small' | 'large'; url: string }
  | { type: 'skill'; name: string; expertise: ExpertiseLevel };

const expertiseLevels: ExpertiseLevel[] = [
  'Amateur/Beginner',
  'Intermediate',
  'Expert',
  'Master',
  'Grandmaster',
  'Paragon/One Above All',
];

const emptyEditorData: CharacterEditorData = {
  displayName: '',
  fullName: '',
  species: '',
  specification: '',
  age: '',
  sexuality: '',
  relationshipStatus: '',
  profession: '',
  residence: '',
  origin: '',
  era: '',
  biography: '',
  imageSettings: '',
  frameImageUrl: '',
  portraitImageUrl: '',
  headerBackgroundUrl: '',
  colorCodes: '',
  characterText: '',
  abilities: '',
  customFields: ['', ''],
};

const mergeEditorData = (data?: Partial<CharacterEditorData>): CharacterEditorData => ({
  ...emptyEditorData,
  ...(data || {}),
});

export const formFromCharacter = (character: EditableCharacter): CharacterForm => {
  const editorData = mergeEditorData(character.editorData);
  return {
    name: character.name,
    race: character.race,
    spec: character.spec,
    gender: character.gender,
    editorData: {
      ...editorData,
      displayName: editorData.displayName || character.name,
      species: editorData.species || character.race,
      specification: editorData.specification || character.spec,
    },
  };
};

export const payloadFromForm = (form: CharacterForm): CharacterForm => {
  const editorData = {
    ...form.editorData,
    displayName: form.editorData.displayName || form.name,
    species: form.editorData.species || form.race,
    specification: form.editorData.specification || form.spec,
  };

  return {
    ...form,
    name: form.name || editorData.displayName,
    race: form.race || editorData.species,
    spec: form.spec || editorData.specification,
    editorData,
  };
};

type CharacterEditorProps = {
  character: EditableCharacter;
  fullPage?: boolean;
  onSave: (payload: CharacterForm) => void | Promise<void>;
  onCancel?: () => void;
};

export default function CharacterEditor({ character, fullPage = false, onSave, onCancel }: CharacterEditorProps) {
  const [activeSection, setActiveSection] = useState<EditorSection>('charId');
  const [activeTab, setActiveTab] = useState<EditorTab>('charId');
  const [form, setForm] = useState<CharacterForm>(() => formFromCharacter(character));
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [customFields, setCustomFields] = useState<string[]>(() => {
    const fields = formFromCharacter(character).editorData.customFields;
    return fields.length >= 2 ? fields : ['', ''];
  });
  const [tabBuilderContent, setTabBuilderContent] = useState<Record<BuilderTab, TabBuilderItem[]>>({
    character: [],
    abilities: [],
  });

  const shellClassName = useMemo(
    () => (fullPage ? `${styles.editorShell} ${styles.fullPage}` : styles.editorShell),
    [fullPage],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleEditorDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((currentForm) => {
      const nextEditorData = { ...currentForm.editorData, [name]: value };
      return {
        ...currentForm,
        name: name === 'displayName' ? value : currentForm.name,
        race: name === 'species' ? value : currentForm.race,
        spec: name === 'specification' ? value : currentForm.spec,
        editorData: nextEditorData,
      };
    });
  };

  const handleCustomFieldChange = (index: number, value: string) => {
    setCustomFields((currentFields) => currentFields.map((field, fieldIndex) => (fieldIndex === index ? value : field)));
  };

  const addCustomFields = () => {
    setCustomFields((currentFields) => {
      if (currentFields.length >= 20) return currentFields;
      return [...currentFields, '', ''];
    });
  };

  const customFieldGroups = Array.from({ length: Math.ceil(customFields.length / 2) }, (_, groupIndex) => ({
    titleIndex: groupIndex * 2,
    valueIndex: groupIndex * 2 + 1,
  }));

  const handleTabBulletChange = (tab: BuilderTab, itemIndex: number, valueIndex: 0 | 1, value: string) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].map((item, index) => {
        if (index !== itemIndex || item.type !== 'bullet') return item;
        const nextValues: [string, string] = [...item.values];
        nextValues[valueIndex] = value;
        return { ...item, values: nextValues };
      }),
    }));
  };

  const handleTabTextareaChange = (tab: BuilderTab, itemIndex: number, value: string) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].map((item, index) => (
        index === itemIndex && item.type === 'textarea' ? { ...item, value } : item
      )),
    }));
  };

  const handleTabImageChange = (tab: BuilderTab, itemIndex: number, url: string) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].map((item, index) => (
        index === itemIndex && item.type === 'image' ? { ...item, url } : item
      )),
    }));
  };

  const handleTabHeadlineChange = (tab: BuilderTab, itemIndex: number, value: string) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].map((item, index) => (
        index === itemIndex && item.type === 'headline' ? { ...item, value } : item
      )),
    }));
  };

  const handleTabSkillChange = (tab: BuilderTab, itemIndex: number, field: 'name' | 'expertise', value: string) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].map((item, index) => (
        index === itemIndex && item.type === 'skill' ? { ...item, [field]: value } : item
      )),
    }));
  };

  const countTabInputs = (items: TabBuilderItem[]) => items.reduce((count, item) => count + (item.type === 'bullet' || item.type === 'skill' ? 2 : 1), 0);

  const addTabItem = (tab: BuilderTab, item: TabBuilderItem) => {
    setTabBuilderContent((currentContent) => {
      const itemInputs = item.type === 'bullet' ? 2 : 1;
      if (countTabInputs(currentContent[tab]) + itemInputs > 20) return currentContent;
      return {
        ...currentContent,
        [tab]: [...currentContent[tab], item],
      };
    });
  };

  const deleteTabItem = (tab: BuilderTab, itemIndex: number) => {
    setTabBuilderContent((currentContent) => ({
      ...currentContent,
      [tab]: currentContent[tab].filter((_, index) => index !== itemIndex),
    }));
  };

  const moveTabItem = (tab: BuilderTab, itemIndex: number, direction: -1 | 1) => {
    setTabBuilderContent((currentContent) => {
      const nextIndex = itemIndex + direction;
      if (nextIndex < 0 || nextIndex >= currentContent[tab].length) return currentContent;

      const nextItems = [...currentContent[tab]];
      [nextItems[itemIndex], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[itemIndex]];

      return {
        ...currentContent,
        [tab]: nextItems,
      };
    });
  };

  const formWithCustomFields = useMemo(
    () => ({ ...form, editorData: { ...form.editorData, customFields } }),
    [customFields, form],
  );

  const handleSaveClick = async () => {
    setSaveStatus('saving');
    try {
      await onSave(payloadFromForm(formWithCustomFields));
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const showSteckbrief = activeSection === 'charId' && activeTab === 'charId';
  const showTabBuilder = activeSection === 'charId' && activeTab !== 'charId';
  const showImageSettings = activeSection === 'imageSettings';
  const blankTitle = activeSection !== 'charId'
    ? activeSection
    : activeTab;

  return (
    <div className={shellClassName}>
      {!fullPage && onCancel && (
        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Charaktereditor schließen">
          ×
        </button>
      )}
      <aside className={styles.sidebar}>
        <h2>Charakter</h2>
        <button type="button" className={activeSection === 'charId' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveSection('charId')}>Steckbrief</button>
        <button type="button" className={activeSection === 'biography' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveSection('biography')}>Biografie</button>
        <button type="button" className={activeSection === 'imageSettings' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveSection('imageSettings')}>Bildeinstellungen</button>
        <button type="button" className={activeSection === 'colorCodes' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveSection('colorCodes')}>Farbcodes</button>
      </aside>

      <section className={styles.main}>
        <div className={styles.tabs}>
          <button type="button" className={activeTab === 'charId' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('charId')}>Char ID</button>
          <button type="button" className={activeTab === 'character' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('character')}>Character</button>
          <button type="button" className={activeTab === 'abilities' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('abilities')}>Abilities</button>
        </div>

        {showSteckbrief ? (
          <>
            <div className={styles.formGrid}>
              <label>
                <span>Vollständiger Name</span>
                <small>Alle vorhandenen Namen eintragen, zB Vorname Zweitname Nachname, diese werden nur in der ID angezeigt</small>
                <input name="fullName" placeholder="Vollständiger Name" value={form.editorData.fullName} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Alias</span>
                <small>Name deines Chars, der in der Bewohnerliste angezeigt wird</small>
                <input name="displayName" placeholder="Alias" value={form.editorData.displayName} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Spezies</span>
                <small>text</small>
                <input name="species" placeholder="Spezies" value={form.editorData.species} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Spezifikation</span>
                <small>text</small>
                <input name="specification" placeholder="Spezifikation" value={form.editorData.specification} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Alter</span>
                <small>text</small>
                <input name="age" placeholder="Alter" value={form.editorData.age} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Geschlecht</span>
                <small>text</small>
                <select name="gender" value={form.gender} onChange={handleInputChange}>
                  <option value="Männlich">Männlich</option>
                  <option value="Weiblich">Weiblich</option>
                  <option value="Divers">Divers</option>
                </select>
              </label>
              <label>
                <span>Sexualität</span>
                <small>text</small>
                <input name="sexuality" placeholder="Sexualität" value={form.editorData.sexuality} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Beziehungsstand</span>
                <small>text</small>
                <input name="relationshipStatus" placeholder="Beziehungsstand" value={form.editorData.relationshipStatus} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Beruf</span>
                <small>text</small>
                <input name="profession" placeholder="Beruf" value={form.editorData.profession} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Wohnsitz</span>
                <small>text</small>
                <input name="residence" placeholder="Wohnsitz" value={form.editorData.residence} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Herkunft</span>
                <small>text</small>
                <input name="origin" placeholder="Herkunft" value={form.editorData.origin} onChange={handleEditorDataChange} />
              </label>
              <label>
                <span>Zeitalter</span>
                <small>text</small>
                <input name="era" placeholder="Zeitalter" value={form.editorData.era} onChange={handleEditorDataChange} />
              </label>
            </div>

            <section className={styles.customSection}>
              <div className={styles.customHeader}>
                <h3 className={styles.customTitle}>Wissenswertes</h3>
                <div className={styles.customRule} />
              </div>
              <p className={styles.customDescription}>Hier beginnt die Custom Sektion. Du kannst dir deine eigenen Kategorien erstellen.</p>
              <div className={styles.customControls}>
                <div className={styles.customCategoryGrid}>
                  {customFieldGroups.map(({ titleIndex, valueIndex }) => (
                    <div key={titleIndex} className={styles.customFieldGroup}>
                      <input
                        className={`${styles.customInput} ${styles.customTitleInput}`}
                        placeholder="Z.B. Kleidungsstil"
                        value={customFields[titleIndex] || ''}
                        onChange={(event) => handleCustomFieldChange(titleIndex, event.target.value)}
                      />
                      <input
                        className={styles.customInput}
                        placeholder="Z.B. leger"
                        value={customFields[valueIndex] || ''}
                        onChange={(event) => handleCustomFieldChange(valueIndex, event.target.value)}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.addCategoryButton}
                    onClick={addCustomFields}
                    disabled={customFields.length >= 20}
                  >
                    Neue Kategorie hinzufügen
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : showImageSettings ? (
          <section className={styles.formGrid}>
            <label className={styles.fullWidth}>
              <span>Linkes Fensterbild</span>
              <small>URL für das große, fensterartige Bild links im Profil</small>
              <input name="frameImageUrl" placeholder="https://…" value={form.editorData.frameImageUrl} onChange={handleEditorDataChange} />
            </label>
            <label className={styles.fullWidth}>
              <span>Quadratisches Profilbild</span>
              <small>URL für den quadratischen Rahmen in der ersten Profilseite</small>
              <input name="portraitImageUrl" placeholder="https://…" value={form.editorData.portraitImageUrl} onChange={handleEditorDataChange} />
            </label>
            <label className={styles.fullWidth}>
              <span>Hintergrund unter der Navigation</span>
              <small>URL für den Hintergrundbereich unter der oberen Profilnavigation</small>
              <input name="headerBackgroundUrl" placeholder="https://…" value={form.editorData.headerBackgroundUrl} onChange={handleEditorDataChange} />
            </label>
          </section>
        ) : showTabBuilder ? (
          <section className={styles.tabBuilder}>
            <div className={styles.tabBuilderItems}>
              {tabBuilderContent[activeTab as BuilderTab].map((item, itemIndex) => {
                const builderTab = activeTab as BuilderTab;
                const isLargeItem = item.type === 'headline' || item.type === 'skill' || item.size === 'large';
                const itemClassName = `${styles.tabBuilderItem} ${isLargeItem ? styles.tabBuilderItemLarge : styles.tabBuilderItemSmall}`;
                const blockControls = (
                  <div className={styles.blockControls}>
                    <button
                      type="button"
                      className={styles.moveBlockButton}
                      onClick={() => moveTabItem(builderTab, itemIndex, -1)}
                      disabled={itemIndex === 0}
                      aria-label="Baustein nach oben verschieben"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.moveBlockButton}
                      onClick={() => moveTabItem(builderTab, itemIndex, 1)}
                      disabled={itemIndex === tabBuilderContent[builderTab].length - 1}
                      aria-label="Baustein nach unten verschieben"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBlockButton}
                      onClick={() => deleteTabItem(builderTab, itemIndex)}
                      aria-label="Baustein löschen"
                    >
                      ×
                    </button>
                  </div>
                );

                if (item.type === 'headline') {
                  return (
                    <div key={`headline-${itemIndex}`} className={`${itemClassName} ${styles.builderBlock}`}>
                      {blockControls}
                      <input
                        className={`${styles.customInput} ${styles.headlineInput}`}
                        placeholder="Überschrift"
                        value={item.value}
                        onChange={(event) => handleTabHeadlineChange(activeTab as BuilderTab, itemIndex, event.target.value)}
                      />
                    </div>
                  );
                }

                if (item.type === 'bullet') {
                  return (
                    <div key={`bullet-${itemIndex}`} className={`${itemClassName} ${styles.builderBlock}`}>
                      {blockControls}
                      <div className={styles.customFieldGroup}>
                        <input
                          className={`${styles.customInput} ${styles.customTitleInput}`}
                          placeholder="Titel"
                          value={item.values[0]}
                          onChange={(event) => handleTabBulletChange(activeTab as BuilderTab, itemIndex, 0, event.target.value)}
                        />
                        <input
                          className={styles.customInput}
                          placeholder="Wert"
                          value={item.values[1]}
                          onChange={(event) => handleTabBulletChange(activeTab as BuilderTab, itemIndex, 1, event.target.value)}
                        />
                      </div>
                    </div>
                  );
                }

                if (item.type === 'image') {
                  return (
                    <div key={`image-${itemIndex}`} className={`${itemClassName} ${styles.builderBlock} ${styles.imageBlock}`}>
                      {blockControls}
                      <input
                        className={styles.customInput}
                        placeholder="Bild-URL"
                        value={item.url}
                        onChange={(event) => handleTabImageChange(activeTab as BuilderTab, itemIndex, event.target.value)}
                      />
                      {item.url && <img className={styles.imagePreview} src={item.url} alt="Vorschau" />}
                    </div>
                  );
                }

                if (item.type === 'skill') {
                  return (
                    <div key={`skill-${itemIndex}`} className={`${itemClassName} ${styles.builderBlock}`}>
                      {blockControls}
                      <div className={styles.skillFields}>
                        <input
                          className={styles.customInput}
                          placeholder="Skillname"
                          value={item.name}
                          onChange={(event) => handleTabSkillChange(activeTab as BuilderTab, itemIndex, 'name', event.target.value)}
                        />
                        <select
                          className={styles.customInput}
                          value={item.expertise}
                          onChange={(event) => handleTabSkillChange(activeTab as BuilderTab, itemIndex, 'expertise', event.target.value)}
                        >
                          {expertiseLevels.map((expertise) => (
                            <option key={expertise} value={expertise}>{expertise}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`textarea-${itemIndex}`} className={`${itemClassName} ${styles.builderBlock}`}>
                    {blockControls}
                    <textarea
                      className={styles.customInput}
                      rows={item.size === 'large' ? 6 : 4}
                      placeholder={item.size === 'large' ? 'Großes Freitextfeld' : 'Kleines Freitextfeld'}
                      value={item.value}
                      onChange={(event) => handleTabTextareaChange(activeTab as BuilderTab, itemIndex, event.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.tabBuilderActions}>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'headline', value: '' })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) >= 20}
              >
                Überschrift hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'bullet', size: 'large', values: ['', ''] })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) > 18}
              >
                Langen Stichpunkt hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'bullet', size: 'small', values: ['', ''] })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) > 18}
              >
                Kleinen Stichpunkt hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'textarea', size: 'large', value: '' })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) >= 20}
              >
                Großes Textfeld hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'textarea', size: 'small', value: '' })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) >= 20}
              >
                Kleines Textfeld hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'image', size: 'large', url: '' })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) >= 20}
              >
                Großes Bild hinzufügen
              </button>
              <button
                type="button"
                className={styles.addCategoryButton}
                onClick={() => addTabItem(activeTab as BuilderTab, { type: 'image', size: 'small', url: '' })}
                disabled={countTabInputs(tabBuilderContent[activeTab as BuilderTab]) >= 20}
              >
                Kleines Bild hinzufügen
              </button>
              {activeTab === 'abilities' && (
                <button
                  type="button"
                  className={styles.addCategoryButton}
                  onClick={() => addTabItem('abilities', { type: 'skill', name: '', expertise: 'Amateur/Beginner' })}
                  disabled={countTabInputs(tabBuilderContent.abilities) > 18}
                >
                  Skill hinzufügen
                </button>
              )}
            </div>
          </section>
        ) : (
          <div className={styles.blankView}>{blankTitle} Ansicht</div>
        )}

        <div className={styles.actions}>
          <div className={styles.saveFeedback} aria-live="polite">
            {saveStatus === 'saving' && 'Speichert…'}
            {saveStatus === 'saved' && '✓ Gespeichert'}
            {saveStatus === 'error' && 'Speichern fehlgeschlagen'}
          </div>
          <button className="button" onClick={handleSaveClick} disabled={saveStatus === 'saving'}>Speichern</button>
          {onCancel && <button className="button button--ghost" onClick={() => setShowCancelConfirm(true)}>Abbrechen</button>}
        </div>
      </section>

      {showCancelConfirm && onCancel && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-label="Charakterbearbeitung schließen">
          <div className={styles.confirmBox}>
            <p>Möchtest du die Charakterbearbeitung wirklich schließen?</p>
            <div className={styles.confirmActions}>
              <button type="button" className="button" onClick={onCancel}>Ja</button>
              <button type="button" className="button button--ghost" onClick={() => setShowCancelConfirm(false)}>Nein</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
