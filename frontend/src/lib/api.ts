const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
    DEFAULT_API_BASE_URL;

export function apiUrl(path: string): string {
    if (!path.startsWith("/")) {
        throw new Error("API path must start with '/'.");
    }
    return `${API_BASE_URL}${path}`;
}
