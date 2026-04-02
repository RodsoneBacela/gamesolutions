import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gs_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  // Remove empty params
  if (cfg.params) {
    Object.keys(cfg.params).forEach(k => {
      if (cfg.params[k] === '' || cfg.params[k] === null || cfg.params[k] === undefined) {
        delete cfg.params[k];
      }
    });
  }
  return cfg;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise(resolve => {
          queue.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh');
        const token = data.access_token;
        localStorage.setItem('gs_token', token);
        queue.forEach(fn => fn(token));
        queue = [];
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem('gs_token');
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
