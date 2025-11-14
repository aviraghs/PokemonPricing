'use client';

import styles from './SkeletonLoader.module.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'set' | 'text' | 'image' | 'trend';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({
  type = 'card',
  count = 4,
  className = ''
}: SkeletonLoaderProps) {

  if (type === 'card') {
    return (
      <div className={`${styles.skeletonGrid} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonText}></div>
              <div className={styles.skeletonText} style={{ width: '60%' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'set') {
    return (
      <div className={`${styles.skeletonSetGrid} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.skeletonSet}>
            <div className={styles.skeletonSetImage}></div>
            <div className={styles.skeletonSetContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonText}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'image') {
    return <div className={`${styles.skeletonImage} ${className}`}></div>;
  }

  if (type === 'trend') {
    return (
      <div className={`${styles.skeletonTrendGrid} ${className}`}>
        {/* Rising Trends Column */}
        <div className={styles.skeletonTrendColumn}>
          <div className={styles.skeletonTrendHeader}></div>
          <div className={styles.skeletonTrendList}>
            {Array.from({ length: Math.ceil(count / 2) }).map((_, i) => (
              <div key={i} className={styles.skeletonTrendItem}>
                <div className={styles.skeletonTrendThumbnail}></div>
                <div className={styles.skeletonTrendInfo}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonText} style={{ width: '70%' }}></div>
                </div>
                <div className={styles.skeletonTrendStats}>
                  <div className={styles.skeletonText} style={{ width: '50px' }}></div>
                  <div className={styles.skeletonText} style={{ width: '40px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Falling Trends Column */}
        <div className={styles.skeletonTrendColumn}>
          <div className={styles.skeletonTrendHeader}></div>
          <div className={styles.skeletonTrendList}>
            {Array.from({ length: Math.floor(count / 2) }).map((_, i) => (
              <div key={i} className={styles.skeletonTrendItem}>
                <div className={styles.skeletonTrendThumbnail}></div>
                <div className={styles.skeletonTrendInfo}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonText} style={{ width: '70%' }}></div>
                </div>
                <div className={styles.skeletonTrendStats}>
                  <div className={styles.skeletonText} style={{ width: '50px' }}></div>
                  <div className={styles.skeletonText} style={{ width: '40px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default text skeleton
  return (
    <div className={`${styles.skeletonText} ${className}`}></div>
  );
}
