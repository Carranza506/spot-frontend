import { Link, useParams } from 'react-router-dom';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './ComingSoonPage.module.css';

/**
 * What the top bar's search, "Nueva reservación" and bell will be (#101). They're in the design but
 * outside the MVP: there's no endpoint behind them yet, so they land here instead of doing nothing.
 */
const FEATURES: Record<string, { title: string; text: string }> = {
  'nueva-reservacion': {
    title: 'Nueva reservación',
    text: 'Pronto vas a poder agendar una cita desde el panel, por ejemplo para un cliente que llamó o llegó sin reservar. Por ahora, tus clientes reservan desde la app.',
  },
  busqueda: {
    title: 'Buscar clientes y reservaciones',
    text: 'Pronto vas a poder buscar a un cliente por nombre y ver todas sus citas. Por ahora, en Reservaciones podés filtrar por estado y por fecha.',
  },
  notificaciones: {
    title: 'Notificaciones',
    text: 'Pronto vas a ver aquí los avisos de tu negocio: reservas nuevas, cancelaciones y reseñas. Por ahora, las reservas por confirmar están en Hoy.',
  },
};

export function ComingSoonPage() {
  const { feature = '' } = useParams();
  const info = FEATURES[feature] ?? { title: 'Próximamente', text: 'Esta función todavía no está disponible.' };

  return (
    <article className={`${pageStyles.card} ${styles.card}`}>
      <span className={styles.badge}>Próximamente</span>
      <h2 className={styles.title}>{info.title}</h2>
      <p className={styles.lead}>Seguimos trabajando en esto: no forma parte de esta primera versión de Spot.</p>
      <p className={styles.text}>{info.text}</p>
      <Link to="/dashboard" className={styles.back}>
        Volver a Hoy
      </Link>
    </article>
  );
}
