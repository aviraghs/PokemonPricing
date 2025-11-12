'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from './LoginModal';
import styles from './AuthButtons.module.css';

interface User {
  id: string;
  username: string;
  email: string;
}

export default function AuthButtons() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setShowDropdown(false);
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (user) {
    return (
      <div className={styles.userMenu}>
        <div className={styles.userButton} onClick={() => setShowDropdown(!showDropdown)}>
          <div className={styles.userAvatar}>{user.username[0].toUpperCase()}</div>
          <span>{user.username}</span>
        </div>
        {showDropdown && (
          <div className={styles.dropdownMenu}>
            <a href="/mycollection" className={styles.dropdownItem}>
              <span className={styles.emoji}>📦</span> My Collection
            </a>
            <div className={styles.dropdownItem} onClick={handleLogout}>
              <span className={styles.emoji}>🚪</span> Logout
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button className={styles.authButton} onClick={() => setShowModal(true)}>
        Login
      </button>
      {showModal && <LoginModal onClose={() => setShowModal(false)} onSuccess={checkAuth} />}
    </>
  );
}
