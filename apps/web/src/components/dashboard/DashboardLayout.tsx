import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getOwnProfile, logout, type components } from '@spot/shared';
import { authClient } from '../../api/client';
import {
  CalendarIcon,
  ChatIcon,
  ClockIcon,
  GearIcon,
  GridIcon,
  LogoIcon,
  LogoutIcon,
  StoreIcon,
  TagIcon,
} from './icons';
import styles from './DashboardLayout.module.css';

type User = components['schemas']['User'];

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: GridIcon },
  { path: '/reservations', label: 'Reservaciones', Icon: CalendarIcon },
  { path: '/services', label: 'Servicios', Icon: StoreIcon },
  { path: '/categories', label: 'Categorías', Icon: TagIcon },
  { path: '/schedule', label: 'Horarios', Icon: ClockIcon },
  { path: '/profile', label: 'Perfil', Icon: GearIcon },
  { path: '/reviews', label: 'Reseñas', Icon: ChatIcon },
];

function initials(user: User | null): string {
  if (!user) return '';
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const activeItem = NAV_ITEMS.find((item) => item.path === location.pathname);
  const title = activeItem?.label ?? 'Dashboard';

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <LogoIcon />
          <span>Spot</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          <LogoutIcon />
          <span>Cerrar sesión</span>
        </button>
      </aside>
      <div className={styles.contentColumn}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>Salón Bella Vista · Administrador</p>
          </div>
          <div className={styles.avatar}>{initials(user)}</div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
