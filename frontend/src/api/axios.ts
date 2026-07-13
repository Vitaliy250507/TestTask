import axios from 'axios';

export const RENDER_BACKEND_URL = import.meta.env.VITE_API_URL;

export const API_BASE_URL = RENDER_BACKEND_URL || 'http://localhost:8000';

if (RENDER_BACKEND_URL) {
    axios.interceptors.request.use((config) => {
        if (config.url && config.url.includes('http://localhost:8000')) {
            config.url = config.url.replace('http://localhost:8000', RENDER_BACKEND_URL);
        }
        return config;
    });
}

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api/`,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;