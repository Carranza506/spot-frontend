import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@spot/shared';
import { authClient } from '../../api/client';
import { usePlanUsage } from '../../pages/services/usePlanUsage';
import { useBusinessContext } from '../../routes/businessContext';
import {
  BellIcon,
  CalendarIcon,
  ChatIcon,
  ClockIcon,
  GearIcon,
  ListIcon,
  LogoIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  StoreIcon,
  TagIcon,
} from './icons';
import styles from './DashboardLayout.module.css';

// The menu, grouped by what the owner is doing (#101): running the day, or setting up the business.
const NAV_GROUPS = [
  {
    label: 'Agenda',
    items: [
      { path: '/dashboard', label: 'Hoy', Icon: CalendarIcon },
      { path: '/reservations', label: 'Reservaciones', Icon: ListIcon },
      { path: '/schedule', label: 'Horarios', Icon: ClockIcon },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { path: '/services', label: 'Servicios', Icon: StoreIcon },
      { path: '/profile', label: 'Perfil del negocio', Icon: GearIcon },
      { path: '/reviews', label: 'Reseñas', Icon: ChatIcon },
      { path: '/categories', label: 'Categorías', Icon: TagIcon },
    ],
  },
];

// Every section's title, including the two reached from outside the menu: the plan card and the avatar.
const SECTIONS = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  { path: '/billing', label: 'Plan' },
  { path: '/account', label: 'Mi cuenta' },
  { path: '/proximamente', label: 'Próximamente' },
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
  const activeItem = SECTIONS.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );
  const title = activeItem?.label ?? 'Hoy';
  // Read again on every section change, so it follows a service created or deactivated in Servicios.
  const planUsage = usePlanUsage(business.id, location.pathname);

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
        {NAV_GROUPS.map((group) => (
          <nav key={group.label} className={styles.nav} aria-labelledby={`nav-${group.label}`}>
            <p id={`nav-${group.label}`} className={styles.navGroup}>
              {group.label}
            </p>
            {group.items.map(({ path, label, Icon }) => (
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
        ))}
        <Link to="/billing" className={styles.planCard} onClick={() => setMenuOpen(false)}>
          <span className={styles.planName}>Plan {planUsage?.planName ?? ''}</span>
          {planUsage?.max != null ? (
            <>
              <span>
                {planUsage.active} de {planUsage.max} servicios activos
              </span>
              <span className={styles.meter} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (planUsage.active / planUsage.max) * 100)}%` }} />
              </span>
              <span className={styles.planLink}>Ver planes</span>
            </>
          ) : (
            <span className={styles.planLink}>{planUsage ? 'Sin límite de servicios' : 'Ver planes'}</span>
          )}
        </Link>
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
          {/* Outside the MVP for now: they open a "Próximamente" page instead of doing nothing (#101). */}
          <Link to="/proximamente/busqueda" className={styles.searchLink}>
            <SearchIcon />
            <span>Buscar cliente o reservación</span>
          </Link>
          <Link to="/proximamente/nueva-reservacion" className={styles.newBooking}>
            Nueva reservación
          </Link>
          <Link to="/proximamente/notificaciones" className={styles.iconLink} aria-label="Notificaciones" title="Notificaciones">
            <BellIcon />
          </Link>
          <Link to="/account" className={styles.avatar} aria-label="Mi cuenta" title="Mi cuenta">
            {initials(business.name)}
          </Link>
        </header>
        <main className={styles.content}>
          <Outlet context={businessContext} />
        </main>
      </div>
    </div>
  );
}
