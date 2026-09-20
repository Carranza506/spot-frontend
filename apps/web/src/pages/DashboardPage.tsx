import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOwnProfile, logout, type components } from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import styles from './DashboardPage.module.css';

type User = components['schemas']['User'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getOwnProfile(authClient)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await logout(authClient);
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span>{user ? `Hola, ${user.firstName}` : 'Panel de administración'}</span>
        <Button type="button" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </header>
      <p>Este es el panel de administración de tu negocio.</p>
    </div>
  );
}
