'use client';

import { useEffect, useState } from 'react';
import styles from './LanguageSelector.module.css';

export default function LanguageSelector() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage') || 'en';
    setLanguage(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
    // Optionally reload sets or trigger a refresh
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  };

  return (
    <select className={styles.languageSelect} value={language} onChange={handleChange}>
      <option value="en">EN</option>
      <option value="ja">JA</option>
      <option value="ko">KO</option>
      <option value="zh">中文</option>
      <option value="fr">FR</option>
      <option value="de">DE</option>
      <option value="es">ES</option>
      <option value="it">IT</option>
      <option value="pt">PT</option>
    </select>
  );
}
