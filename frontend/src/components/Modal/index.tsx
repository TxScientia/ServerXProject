import { ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  title: ReactNode;
  children: ReactNode;
};

type ModalActionsProps = {
  children: ReactNode;
};

export function Modal({ title, children }: ModalProps) {
  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.content}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }: ModalActionsProps) {
  return <div className={styles.actions}>{children}</div>;
}

export function ModalSpacer() {
  return <span className={styles.spacer} />;
}
