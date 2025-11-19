'use client';

import { useRef, useState, MouseEvent } from 'react';
import styles from './HoloCard.module.css';

interface HoloCardProps {
  children: React.ReactNode;
  rarity?: string;
  className?: string;
}

export default function HoloCard({ children, rarity = '', className = '' }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate mouse position relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate rotation (limit to 10 degrees)
    const rotateXValue = ((y - centerY) / centerY) * -10;
    const rotateYValue = ((x - centerX) / centerX) * 10;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
    setMouseX(x);
    setMouseY(y);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Determine rarity class
  const getRarityClass = () => {
    const r = rarity.toLowerCase();
    
    // GOLD TIER (Ultra Rares, Hyper Rares, VMAX/VSTAR, etc.)
    if (
      r.includes('hyper') || 
      r.includes('ultra') || 
      r.includes('secret') || 
      r.includes('vmax') || 
      r.includes('vstar') || 
      r.includes('mega') || 
      r.includes('legend') ||
      r.includes('crown')
    ) return styles.goldRarity;

    // RAINBOW TIER (Special, Radiant, Amazing, Illustration)
    if (
      r.includes('amazing') || 
      r.includes('radiant') || 
      r.includes('illustration') || 
      r.includes('shiny') ||
      r.includes('special') ||
      r.includes('ace spec') ||
      r.includes('classic collection')
    ) return styles.rainbowRarity;

    // SILVER TIER (Holo Rares, Double Rares, V, etc.)
    if (
      r.includes('holo') || 
      r.includes('double') || 
      r.includes('v') || // Catches basic V cards
      r.includes('prime') ||
      r.includes('star') || // One Star, Two Star, etc.
      r.includes('diamond') ||
      r.includes('full art')
    ) return styles.silverRarity;

    // BLUE TIER (Base rarities)
    // Common, Uncommon, Rare, None
    return styles.blueRarity;
  };

  return (
    <div className={`${styles.holoCardWrapper} ${className}`}>
      <div 
        ref={cardRef}
        className={`${styles.holoCard} ${getRarityClass()}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          '--rotate-x': `${rotateX}deg`,
          '--rotate-y': `${rotateY}deg`,
          '--mouse-x': `${mouseX}px`,
          '--mouse-y': `${mouseY}px`
        } as React.CSSProperties}
      >
        <div className={styles.holoContent}>
          {children}
        </div>
      </div>
    </div>
  );
}
