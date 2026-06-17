const API = 'http://localhost:3001/api';

async function request(path, { method = 'GET', body } = {}) {
  const opts = { method, credentials: 'include' };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API + path, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const getMe      = ()                => request('/sessions/current');
export const login      = (email, password) => request('/sessions', { method: 'POST', body: { email, password } });
export const logout     = ()                => request('/sessions/current', { method: 'DELETE' });
export const getNetwork = ()                => request('/network');
export const startGame  = ()                => request('/games', { method: 'POST' });
