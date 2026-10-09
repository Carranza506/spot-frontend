/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** "true" serves Reservaciones from an in-browser mock until spot-backend #68/#69 land. */
  readonly VITE_BOOKINGS_MOCK?: string;
  /** "true" serves schedule exceptions from an in-browser mock until that endpoint exists (weekly hours are always real). */
  readonly VITE_SCHEDULE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
