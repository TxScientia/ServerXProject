import styles from './PageHeading.module.css';

interface PageHeadingProps {
  title: string;
  subtitle: string;
}

export default function PageHeading({ title, subtitle }: PageHeadingProps) {
  return (
    <div className={styles.heading}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}
