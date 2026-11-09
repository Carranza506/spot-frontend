import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ApiError, getMyBusiness, logout, type components } from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import { BUSINESS_ONLY_STATE } from './businessOnly';
import type { BusinessContext } from './businessContext';
import styles from './BusinessGuard.module.css';

type Business = components['schemas']['Business'];

type GuardState =
  | { status: 'loading' }
  | { status: 'ready'; business: Business }
  | { status: 'missing' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'error' };

/**
 * A BUSINESS account is only usable once its business profile exists: loads it and hands
 * it to the routes below as outlet context (see BusinessContext), or sends accounts without
 * one to complete it.
 */
export function BusinessGuard() {
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  const fetchBusiness = useCallback(() => {
    getMyBusiness(authClient)
      .then((business) => setState({ status: 'ready', business }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) setState({ status: 'missing' });
        else if (error instanceof ApiError && error.status === 401) setState({ status: 'unauthenticated' });
        // Only a BUSINESS account can read it: a 403 ends the session, and the login says why.
        else if (error instanceof ApiError && error.status === 403) {
          logout(authClient)
            .catch(() => {})
            .finally(() => setState({ status: 'forbidden' }));
        }
        else setState({ status: 'error' });
      });
  }, []);

  useEffect(fetchBusiness, [fetchBusiness]);

  const setBusiness = useCallback((business: Business) => setState({ status: 'ready', business }), []);

  function retry() {
    setState({ status: 'loading' });
    fetchBusiness();
  }

  switch (state.status) {
    case 'ready': {
      const context: BusinessContext = { business: state.business, setBusiness };
      return <Outlet context={context} />;
    }
    case 'missing':
      return <Navigate to="/complete-profile" replace />;
    case 'unauthenticated':
      return <Navigate to="/login" replace />;
    case 'forbidden':
      return <Navigate to="/login" replace state={BUSINESS_ONLY_STATE} />;
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
