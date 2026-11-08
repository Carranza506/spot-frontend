import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, listBusinessCategories, listCategories, replaceBusinessCategories, type components } from '@spot/shared';
import { authClient } from '../api/client';
import { Button } from '../components/Button';
import { useBusinessContext } from '../routes/businessContext';
import formStyles from './AuthForm.module.css';
import pageStyles from './BusinessProfilePage.module.css';
import styles from './categories/Categories.module.css';

type Category = components['schemas']['Category'];

// The contract's max pageSize; the catalog and a business's set are far smaller, so one page each is enough.
const PAGE_SIZE = 100;
const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intentá de nuevo.';

type LoadState = { status: 'loading' } | { status: 'ready'; options: Category[] } | { status: 'error' };

/**
 * The catalog the owner can pick from: active categories plus any inactive one the business
 * already has (so saving doesn't silently drop it). Parents first, each followed by its children.
 */
function pickableCategories(catalog: Category[], assigned: Category[]): Category[] {
  const assignedIds = new Set(assigned.map((c) => c.id));
  const byId = new Map<string, Category>();
  for (const category of [...catalog, ...assigned]) {
    if (category.isActive || assignedIds.has(category.id)) byId.set(category.id, category);
  }
  const all = [...byId.values()];
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, 'es');
  const children = (parentId: string) => all.filter((c) => c.parentCategoryId === parentId).sort(byName);
  // A child whose parent isn't listed is shown as a top-level option.
  const roots = all.filter((c) => !c.parentCategoryId || !byId.has(c.parentCategoryId)).sort(byName);
  return roots.flatMap((root) => [root, ...children(root.id)]);
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** Categorías: the categories a business is listed under, which the client search filters by. */
export function CategoriesPage() {
  const navigate = useNavigate();
  const { business } = useBusinessContext();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(() => {
    Promise.all([
      listCategories(authClient, { pageSize: PAGE_SIZE }),
      listBusinessCategories(authClient, business.id, { pageSize: PAGE_SIZE }),
    ])
      .then(([catalog, assigned]) => {
        const ids = new Set(assigned.data.map((c) => c.id));
        setSavedIds(ids);
        setSelected(ids);
        setLoadState({ status: 'ready', options: pickableCategories(catalog.data, assigned.data) });
      })
      .catch(() => setLoadState({ status: 'error' }));
  }, [business.id]);

  useEffect(fetchCategories, [fetchCategories]);

  function retry() {
    setLoadState({ status: 'loading' });
    fetchCategories();
  }

  function toggle(categoryId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
    setSaved(false);
    setGeneralError(null);
  }

  async function save() {
    setSaved(false);
    setGeneralError(null);
    setSubmitting(true);
    try {
      const updated = await replaceBusinessCategories(authClient, business.id, [...selected]);
      const ids = new Set(updated.map((c) => c.id));
      setSavedIds(ids);
      setSelected(ids);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true });
      } else if (error instanceof ApiError && error.status === 404) {
        // A category was removed from the catalog meanwhile: the reloaded list no longer offers it.
        setGeneralError('Una de las categorías ya no existe. Revisá la lista y guardá de nuevo.');
        fetchCategories();
      } else {
        setGeneralError(error instanceof ApiError ? error.message : NETWORK_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const unchanged = sameSet(selected, savedIds);

  return (
    <div className={styles.page}>
      <article className={pageStyles.card}>
        <h2 className={pageStyles.cardTitle}>Categorías de tu negocio</h2>

        {loadState.status === 'loading' && <p className={pageStyles.placeholder}>Cargando…</p>}
        {loadState.status === 'error' && (
          <div className={styles.stack}>
            <p className={formStyles.generalError}>No se pudieron cargar las categorías.</p>
            <Button type="button" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
        {loadState.status === 'ready' && (
          <div className={styles.stack}>
            <p className={pageStyles.placeholder}>
              Elegí en qué categorías aparece tu negocio. Los clientes las usan para filtrar la búsqueda.
            </p>
            {generalError && <p className={formStyles.generalError}>{generalError}</p>}
            {saved && <p className={pageStyles.success}>Las categorías se guardaron correctamente.</p>}

            {loadState.options.length === 0 ? (
              <p className={pageStyles.placeholder}>Todavía no hay categorías disponibles.</p>
            ) : (
              <ul className={styles.options}>
                {loadState.options.map((category) => {
                  const checked = selected.has(category.id);
                  const parent = loadState.options.find((c) => c.id === category.parentCategoryId);
                  return (
                    <li key={category.id}>
                      <label className={`${styles.option} ${checked ? styles.optionSelected : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(category.id)}
                          disabled={submitting}
                        />
                        <span className={styles.optionText}>
                          <span className={styles.optionName}>
                            {parent ? `${parent.name} › ${category.name}` : category.name}
                          </span>
                          {!category.isActive && <span className={styles.optionDescription}>Ya no está disponible</span>}
                          {category.isActive && category.description && (
                            <span className={styles.optionDescription}>{category.description}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className={styles.footer}>
              <span className={styles.count}>
                {selected.size === 0
                  ? 'Elegí al menos una categoría.'
                  : selected.size === 1
                    ? '1 categoría seleccionada'
                    : `${selected.size} categorías seleccionadas`}
              </span>
              <Button type="button" onClick={save} disabled={submitting || unchanged || selected.size === 0}>
                {submitting ? 'Guardando…' : 'Guardar categorías'}
              </Button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
