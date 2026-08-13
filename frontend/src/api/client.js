// Single configured Axios instance used for every backend call.

import axios from 'axios';

const client = axios.create({
    baseURL:'http://127.0.0.1:5000/api',
});

// Runs before every request — attaches the stored JWT so we don't
// have to manually add the Authorization header on each call.

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token){
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config
});

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response && error.response.status === 401){
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default client;