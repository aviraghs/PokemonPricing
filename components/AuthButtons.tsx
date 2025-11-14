'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoginModal from './LoginModal';
import styles from './AuthButtons.module.css';

export default function AuthButtons() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    router.refresh();
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
