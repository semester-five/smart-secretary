// Minimal JWT utilities used on the client to check expiry before attempting
// a refresh. Kept lightweight to avoid pulling large deps into the bundle.
export function decodeJwtPayload(token: string): { exp?: number } | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const json = new TextDecoder().decode(bytes);
        return JSON.parse(json) as { exp?: number };
    } catch {
        return null;
    }
}

const CLOCK_SKEW_MS = 60_000;

export function isTokenValid(token?: string) {
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") return false;
    return payload.exp * 1000 > Date.now() - CLOCK_SKEW_MS;
}
