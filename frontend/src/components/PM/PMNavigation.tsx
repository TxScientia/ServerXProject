import { useTranslation } from 'react-i18next';
import Badge from '../Badge/Badge';
import styles from './PMNavigation.module.css';

type TabType = 'groups' | 'direct' | 'system';

interface PMNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  groupsUnread: number;
  directUnread: number;
  systemUnread: number;
}

export default function PMNavigation({
  activeTab,
  onTabChange,
  groupsUnread,
  directUnread,
  systemUnread,
}: PMNavigationProps) {
  const { t } = useTranslation();

  return (
    <nav className={styles.pmNav}>
      <button
        className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
        onClick={() => onTabChange('groups')}
      >
        {t('pm.tabGroups')}
        <Badge count={groupsUnread} variant="tab" />
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'direct' ? styles.active : ''}`}
        onClick={() => onTabChange('direct')}
      >
        {t('pm.tabDirect')}
        <Badge count={directUnread} variant="tab" />
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'system' ? styles.active : ''}`}
        onClick={() => onTabChange('system')}
      >
        {t('pm.tabSystem')}
        <Badge count={systemUnread} variant="tab" />
      </button>
    </nav>
  );
}
