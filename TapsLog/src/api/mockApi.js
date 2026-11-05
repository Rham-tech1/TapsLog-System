/**
 * mockApi.js — Backend Prober & Standby Fallback
 * Only engages if live backend is completely offline.
 */
import api from './axiosInstance';

let _mockActive = false;

/** Check if the backend is reachable */
export async function probeBackend() {
  try {
    const res = await api.get('/health', { timeout: 2500 });
    if (res.data?.status === 'online') {
      _mockActive = false;
      return true;
    }
    return false;
  } catch {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const fallback = await fetch(`http://${host}:5000/api/health`, { method: 'GET' });
      if (fallback.ok) {
        _mockActive = false;
        return true;
      }
    } catch {
      // Backend is truly down
    }
    return false;
  }
}

/** Returns true if mock mode is currently active */
export function isMockActive() {
  return _mockActive;
}

/** Install mock interceptor only if backend is offline */
export function installMockInterceptors() {
  _mockActive = true;
  console.warn('[TapsLog] Backend offline. Mock fallback active.');
}
