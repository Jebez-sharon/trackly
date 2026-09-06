import axios from 'axios'

export const TOKEN_KEY ='trackly_token';
export const USER_KEY ='trackly_user';
export const ORGS_KEY ='trackly_orgs';
export const ACTIVE_ORG_KEY ='trackly_active_org';

// From an env var so deploying does not mean editing source.
// Create frontend/.env.local later with VITE_API_URL=... for production.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Attach the token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if(token) config.headers.Authorization = `Bearer ${token}`;
    return config
})

export function clearSession(){
    [TOKEN_KEY, USER_KEY, ORGS_KEY, ACTIVE_ORG_KEY].forEach((k) =>
    localStorage.removeItem(k));
}

api.interceptors.response.use(
    (response) => response,
    (error)=>{
        const data = error.response?.data;
        const status = error.response?.status;

        // Our own routes return {error}. Flask-JWT-Extended returns {msg}
    // for missing, malformed and expired tokens, before our code runs.
    // Every component reads error.message and never has to know which
    const message = data?.error || data?.msg || error.message || 'Something went wrong';


    // 401 = expired or invalid token. 422 = malformed Authorization header.
    // Both mean the session is unusable, so drop it and go to /login —
    // unless we are already there, where a wrong password is a normal 401.
    if ((status === 401 || status === 422) && window.location.pathname !== '/login'){
        clearSession();
        window.location.replace('/login');
    }

    error.message = message;
    error.status = status;
    return Promise.reject(error);
}

);

export default api;

