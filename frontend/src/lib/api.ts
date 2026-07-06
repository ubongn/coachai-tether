export const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:8000`;
