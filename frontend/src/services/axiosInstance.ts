import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
import { store } from '../store'; // Import store to access token
// Import logout action if you want to auto-logout on 401
import { logoutUser } from '../features/auth/store/authSlice';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Increased timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        // const token = store.getState().auth.token;
        const token = localStorage.getItem("authToken");
        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('AXIOS INTERCEPTOR: Authorization header set:', config.headers['Authorization']);
        }
        else {
            console.log('AXIOS INTERCEPTOR: Token not found or headers object missing.');
        }
        return config;
    },
    (error) => {

        return Promise.reject(error);

    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('AXIOS INTERCEPTOR: Unauthorized (401). Token might be invalid or expired.');
            // Option 1: Dispatch logout action (requires authSlice and its actions to be fully set up)
            store.dispatch(logoutUser());
            // Option 2: Redirect to login (simpler, but loses Redux state gracefully)
            // if (!window.location.pathname.includes('/login')) { // Avoid redirect loop
            //    window.location.href = '/login';
            // }
            // It's often better to handle 401 within thunks or components to allow specific UI updates.
        }
        // You can handle other global errors here, e.g., network errors (error.message === 'Network Error')
        return Promise.reject(error);
    }
);

export default axiosInstance;