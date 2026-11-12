import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@spot/shared';
import { authClient } from '../../api/client';
import { useBusinessContext } from '../../routes/businessContext';
import {
  CalendarIcon,
  CardIcon,
  ChatIcon,
  ClockIcon,
  GearIcon,
  GridIcon,
  LogoIcon,
  LogoutIcon,
  MenuIcon,
  StoreIcon,
  TagIcon,
} from './icons';
import styles from './DashboardLayout.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: GridIcon },
  { path: '/reservations', label: 'Reservaciones', Icon: CalendarIcon },
  { path: '/services', label: 'Servicios', Icon: StoreIcon },
  { path: '/categories', label: 'Categorías', Icon: TagIcon },
  { path: '/schedule', label: 'Horarios', Icon: ClockIcon },
  { path: '/profile', label: 'Perfil', Icon: GearIcon },
  { path: '/reviews', label: 'Reseñas', Icon: ChatIcon },
  { path: '/billing', label: 'Plan', Icon: CardIcon },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  // Provided by BusinessGuard, which only renders this layout once the business is loaded;
  // passed on to the pages so they can read it and keep this header in sync after edits.
  const businessContext = useBusinessContext();
  const { business } = businessContext;

  async function handleLogout() {
    await logout(authClient);
    navigate('/login', { replace: true });
  }

  // Prefix match too, so sub-routes (e.g. /billing/success) keep their section's title, as NavLink does.
  const activeItem = NAV_ITEMS.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );
  const title = activeItem?.label ?? 'Dashboard';

  // Narrow screens only (see the @media in the CSS): the sidebar is a drawer behind the menu button.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <div className={styles.page}>
      {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <aside id="dashboard-sidebar" className={[styles.sidebar, menuOpen ? styles.sidebarOpen : ''].join(' ')}>
        <div className={styles.logo}>
          <LogoIcon />
          <span>Spot</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
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
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Abrir menú"
            aria-controls="dashboard-sidebar"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{business.name} · Administrador</p>
          </div>
          <div className={styles.avatar}>{initials(business.name)}</div>
        </header>
        <main className={styles.content}>
          <Outlet context={businessContext} />
        </main>
      </div>
    </div>
  );
}
