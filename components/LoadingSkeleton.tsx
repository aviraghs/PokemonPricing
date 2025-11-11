import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
  type?: 'card' | 'set' | 'list' | 'text';
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({ type = 'card', count = 4, className = '' }: LoadingSkeletonProps) {
  if (type === 'card') {
    return (
      <div className={`${styles.skeletonGrid} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.cardSkeleton}>
            <div className={styles.imageSkeleton}></div>
            <div className={styles.textSkeleton}></div>
            <div className={styles.textSkeleton} style={{ width: '70%' }}></div>
            <div className={styles.textSkeleton} style={{ width: '50%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'set') {
    return (
      <div className={`${styles.skeletonRow} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.setSkeleton}>
            <div className={styles.setImageSkeleton}></div>
            <div className={styles.textSkeleton}></div>
            <div className={styles.textSkeleton} style={{ width: '60%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`${styles.skeletonList} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.listItemSkeleton}>
            <div className={styles.listImageSkeleton}></div>
            <div className={styles.listContent}>
              <div className={styles.textSkeleton}></div>
              <div className={styles.textSkeleton} style={{ width: '70%' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default text skeleton
  return (
    <div className={`${styles.textSkeleton} ${className}`}></div>
  );
}
