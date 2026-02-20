/**
 * api.js — Thin wrapper around fetch().
 * Every request automatically attaches the Bearer token from Store.token.
 */

const Api = (() => {

    async function request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (Store.token) headers['Authorization'] = `Bearer ${Store.token}`;

        const res = await fetch(API_BASE + endpoint, { headers, ...options });

        // Session expired / invalid token
        if (res.status === 401) {
            Auth.logout();
            throw new Error('Unauthorized');
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
    }

    // ── Convenience methods ────────────────────────────────────────────────
    const get    = (ep)           => request(ep);
    const post   = (ep, body)     => request(ep, { method: 'POST',   body: JSON.stringify(body) });
    const put    = (ep, body)     => request(ep, { method: 'PUT',    body: JSON.stringify(body) });
    const del    = (ep)           => request(ep, { method: 'DELETE' });

    return { get, post, put, del };
})();
