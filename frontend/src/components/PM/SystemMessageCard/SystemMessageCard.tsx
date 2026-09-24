import { useTranslation } from 'react-i18next';
import Card from '../../Card';
import styles from './SystemMessageCard.module.css';

export interface SystemMessage {
  id: string;
  from_account_id: string;
  to_account_id: string;
  type: 'still_playing' | 'invite' | 'plot_link' | 'system_news';
  content: string;
  action_required: boolean;
  data?: Record<string, any>;
  response?: Record<string, any>;
  created_at: string;
}

// One button = which action to send + which label to show + whether it's the primary (highlighted) one.
type ActionButton = { action: string; labelKey: string; primary?: boolean };

// The interaction template, as data: for each message type, the buttons it offers.
// A type with an empty list (or no entry) renders as an informational card — no actions.
const ACTION_CONFIG: Record<string, ActionButton[]> = {
  still_playing: [
    { action: 'free', labelKey: 'pm.free' },
    { action: 'keep_occupied', labelKey: 'pm.keepOccupied', primary: true },
  ],
  invite: [
    { action: 'decline', labelKey: 'pm.decline' },
    { action: 'accept', labelKey: 'pm.accept', primary: true },
  ],
  plot_link: [
    { action: 'decline', labelKey: 'pm.decline' },
    { action: 'accept', labelKey: 'pm.accept', primary: true },
  ],
  system_news: [],
};

// The badge label shown per type.
const TYPE_LABEL_KEYS: Record<string, string> = {
  still_playing: 'pm.typeStillPlaying',
  invite: 'pm.typeInvite',
  plot_link: 'pm.typePlotLink',
  system_news: 'pm.typeSystemNews',
};

interface SystemMessageCardProps {
  msg: SystemMessage;
  onRespond: (messageId: string, action: string) => void;
}

export default function SystemMessageCard({ msg, onRespond }: SystemMessageCardProps) {
  const { t } = useTranslation();

  const buttons = ACTION_CONFIG[msg.type] ?? [];
  const showActions = msg.action_required && !msg.response && buttons.length > 0;

  return (
    <div className={styles.wrapper}>
      <Card>
        <div className={styles.header}>
          <span className={styles.type}>{t(TYPE_LABEL_KEYS[msg.type] ?? msg.type)}</span>
          <span className={styles.timestamp}>
            {new Date(msg.created_at).toLocaleString('de-CH')}
          </span>
        </div>

        <p className={styles.content}>{msg.content}</p>

        {showActions && (
          <div className={styles.actions}>
            {buttons.map((btn) => (
              <button
                key={btn.action}
                className={`${styles.actionBtn} ${btn.primary ? styles.primary : ''}`.trim()}
                onClick={() => onRespond(msg.id, btn.action)}
              >
                {t(btn.labelKey)}
              </button>
            ))}
          </div>
        )}

        {msg.response && (
          <div className={styles.responded}>
            {t('pm.answered', { action: msg.response.action })}
          </div>
        )}
      </Card>
    </div>
  );
}
