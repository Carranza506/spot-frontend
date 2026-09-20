import styles from './ComingSoonPage.module.css';

interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
}
