import React from 'react';
import Card from '../Card';
import styles from './PlotCard.module.css';

export type Plot = {
  id: string;
  title: string;
  description: string | null;
  owner_character_id: string;
  created_at: string;
};

type PlotCardProps = {
  plot: Plot;
  onClick: () => void;
};

/** A StoryBook/plot card. Built on the shared Card shell. */
export default function PlotCard({ plot, onClick }: PlotCardProps) {
  return (
    <Card onClick={onClick}>
      <h3 className={styles.title}>{plot.title}</h3>
      {plot.description && <p className={styles.description}>{plot.description}</p>}
    </Card>
  );
}
