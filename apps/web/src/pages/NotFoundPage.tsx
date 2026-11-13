import { Link } from 'react-router-dom';
import { getTokens } from '../api/auth-storage';
import { AuthLayout } from '../components/auth/AuthLayout';

/** Any path the panel doesn't have (BUG-13): it used to send everyone to /login. */
export function NotFoundPage() {
  const signedIn = getTokens() !== null;
  return (
    <AuthLayout
      heading="Página no encontrada"
      footer={<Link to={signedIn ? '/dashboard' : '/login'}>{signedIn ? 'Ir al panel' : 'Ir a iniciar sesión'}</Link>}
    >
      <p>La dirección que abriste no existe o ya no está disponible.</p>
    </AuthLayout>
  );
}
