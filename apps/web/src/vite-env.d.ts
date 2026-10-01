/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** "true" serves the Horarios view from an in-browser mock until the hours/exceptions endpoints exist. */
  readonly VITE_SCHEDULE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
