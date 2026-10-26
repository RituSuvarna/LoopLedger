'use strict';

window.LoopLedgerAPI = (() => {
  const BASE_URL = '/api';

  async function request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });

    const contentType = response.headers.get('content-type') || '';
    let result = null;

    if (contentType.includes('application/json')) {
      result = await response.json();
    }

    if (!response.ok) {
      const error = new Error(
        result?.message || `Request failed (${response.status}).`
      );
      error.status = response.status;
      throw error;
    }

    return result;
  }

  function queryString(params = {}) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    }

    const text = query.toString();
    return text ? `?${text}` : '';
  }

  return {
    health() {
      return request('/health');
    },

    async getDevices(params = {}) {
      const result = await request(
        `/devices${queryString(params)}`
      );
      return result.data || [];
    },

    getDevice(id) {
      return request(`/devices/${encodeURIComponent(id)}`);
    },

    createDevice(device) {
      return request('/devices', {
        method: 'POST',
        body: JSON.stringify(device)
      });
    },

    updateDevice(id, changes) {
      return request(`/devices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
    },

    deleteDevice(id) {
      return request(`/devices/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    },

    getAnalytics() {
      return request('/analytics');
    }
  };
})();