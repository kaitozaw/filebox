import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001', // local
  // baseURL: 'http://54.206.91.186', // live
  headers: { 'Content-Type': 'application/json' },
});

export default axiosInstance;
