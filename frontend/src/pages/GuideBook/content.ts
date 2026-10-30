/**
 * Static GuideBook content (FAQ + Rules). In-code on purpose: these are simple
 * text pages that change rarely, so there is no admin editor or DB backing — edit
 * the text here and redeploy. Keyed by language ('de' is the default).
 *
 * The text below is placeholder copy; replace it with the real FAQ and rules.
 */

export type FaqItem = { q: string; a: string };
export type RuleSection = { heading: string; body: string };

type Lang = 'de' | 'en';

export const FAQ: Record<Lang, FaqItem[]> = {
  de: [
    {
      q: 'Was ist When Worlds Collide?',
      a: 'When Worlds Collide ist ein Play-by-Post-Rollenspiel-Server. Du erstellst Charaktere, trittst Plots (StoryBooks) bei und spielst Szenen gemeinsam mit anderen aus.',
    },
    {
      q: 'Wie fange ich an?',
      a: 'Lege in der Lobby einen Charakter an, wähle ihn aus und betritt den Server. Danach kannst du in den StoryBooks einen offenen Plot suchen und einer Szene beitreten.',
    },
    {
      q: 'Was ist der Unterschied zwischen öffentlichen und privaten Plots?',
      a: 'In öffentlichen Plots kann jeder Charakter posten, ohne beizutreten. Private Plots sind nur für Mitglieder sicht- und bespielbar.',
    },
    {
      q: 'An wen wende ich mich bei Problemen?',
      a: 'Schreibe einem Admin eine Nachricht (PM) oder nutze den OOC-Chat. Wir helfen dir gerne weiter.',
    },
  ],
  en: [
    {
      q: 'What is When Worlds Collide?',
      a: 'When Worlds Collide is a play-by-post roleplay server. You create characters, join plots (StoryBooks) and play out scenes together with others.',
    },
    {
      q: 'How do I get started?',
      a: 'Create a character in the lobby, select it and enter the server. You can then browse the StoryBooks for an open plot and join a scene.',
    },
    {
      q: 'What is the difference between public and private plots?',
      a: 'In public plots any character can post without joining. Private plots are only visible and playable for members.',
    },
    {
      q: 'Who do I contact if I have a problem?',
      a: 'Send an admin a message (PM) or use the OOC chat. We are happy to help.',
    },
  ],
};

export const RULES: Record<Lang, RuleSection[]> = {
  de: [
    {
      heading: 'Respektvoller Umgang',
      body: 'Behandle alle Mitglieder mit Respekt. Belästigung, Diskriminierung und persönliche Angriffe werden nicht geduldet.',
    },
    {
      heading: 'In-Character vs. Out-of-Character',
      body: 'Trenne das Verhalten deines Charakters klar von deiner eigenen Person. Konflikte zwischen Charakteren sind kein Grund für Konflikte zwischen Spielern.',
    },
    {
      heading: 'Inhalte',
      body: 'Halte dich an die Alterskennzeichnung des jeweiligen Plots. Explizite Inhalte sind nur dort erlaubt, wo sie ausdrücklich gestattet sind.',
    },
    {
      heading: 'Fairplay',
      body: 'Kein Powergaming oder Metagaming. Gib anderen Raum, auf deine Posts zu reagieren, und würfle, wo Würfe verlangt werden.',
    },
  ],
  en: [
    {
      heading: 'Be respectful',
      body: 'Treat every member with respect. Harassment, discrimination and personal attacks are not tolerated.',
    },
    {
      heading: 'In-character vs. out-of-character',
      body: 'Keep your character’s behaviour clearly separate from your own. Conflict between characters is no reason for conflict between players.',
    },
    {
      heading: 'Content',
      body: 'Respect each plot’s content rating. Explicit content is only allowed where it is explicitly permitted.',
    },
    {
      heading: 'Fair play',
      body: 'No powergaming or metagaming. Give others room to react to your posts, and roll where rolls are required.',
    },
  ],
};
