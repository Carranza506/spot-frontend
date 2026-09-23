import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ApiError, getMyBusiness, type components } from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import styles from './BusinessGuard.module.css';

type Business = components['schemas']['Business'];

type GuardState =
  | { status: 'loading' }
  | { status: 'ready'; business: Business }
  | { status: 'missing' }
  | { status: 'unauthenticated' }
  | { status: 'error' };

/**
 * A BUSINESS account is only usable once its business profile exists: loads it and hands
 * it to the routes below as outlet context, or sends accounts without one to complete it.
 */
export function BusinessGuard() {
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  const fetchBusiness = useCallback(() => {
    getMyBusiness(authClient)
      .then((business) => setState({ status: 'ready', business }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) setState({ status: 'missing' });
        else if (error instanceof ApiError && error.status === 401) setState({ status: 'unauthenticated' });
        else setState({ status: 'error' });
      });
  }, []);

  useEffect(fetchBusiness, [fetchBusiness]);

  function retry() {
    setState({ status: 'loading' });
    fetchBusiness();
  }

  switch (state.status) {
    case 'ready':
      return <Outlet context={state.business} />;
    case 'missing':
      return <Navigate to="/complete-profile" replace />;
    case 'unauthenticated':
      return <Navigate to="/login" replace />;
    case 'error':
      return (
        <div className={styles.message}>
          <p>No se pudo cargar tu negocio.</p>
          <Button type="button" onClick={retry}>
            Reintentar
          </Button>
        </div>
      );
    default:
      return <div className={styles.message}>Cargando…</div>;
  }
}
