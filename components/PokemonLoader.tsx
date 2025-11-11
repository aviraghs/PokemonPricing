import React from 'react';
import styles from './PokemonLoader.module.css';

interface PokemonLoaderProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function PokemonLoader({
  message = 'Loading...',
  size = 'medium'
}: PokemonLoaderProps) {
  return (
    <div className={styles.loaderContainer}>
      <div className={`${styles.pokeball} ${styles[size]}`}>
        <div className={styles.pokeballTop}></div>
        <div className={styles.pokeballMiddle}>
          <div className={styles.pokeballButton}></div>
        </div>
        <div className={styles.pokeballBottom}></div>
      </div>
      {message && <p className={styles.loadingMessage}>{message}</p>}
    </div>
  );
}
