import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || '/api'
});

axiosInstance.interceptors.request.use(
    (config) => {
        if (!config.headers?.Authorization) {
            try {
                const raw = localStorage.getItem('user');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.token) {
                        config.headers = {
                            ...config.headers,
                            Authorization: `Bearer ${parsed.token}`,
                        };
                    }
                }
            } catch {
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem('user');
            window.location.assign('/login');
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
