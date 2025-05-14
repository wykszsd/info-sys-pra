// src/features/auth/store/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';
import type { UserDetail } from '../../../types'; // Ensure UserDetail is imported
// Ensure UserDetail is imported
// Ensure UserDetail is imported
import type { RootState } from '../../../store';

interface AuthState {
    user: UserDetail | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null; // Explicitly string | null
}

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('authToken'), // localStorage.getItem can return null
    isAuthenticated: !!localStorage.getItem('authToken'),
    isLoading: false,
    error: null, // Initialize error as null
};

export const loginUser = createAsyncThunk<
    { token: string; user: UserDetail },
    { username: string; password_hash: string },
    { rejectValue: string }
>(
    'auth/loginUser',
    async (credentials, { rejectWithValue }) => {
        try {
            const loginResponse = await authApi.login(credentials);
            localStorage.setItem('authToken', loginResponse.token);
            const userProfile = await authApi.fetchUserProfile();
            return { token: loginResponse.token, user: userProfile };
        } catch (error: any) {
            localStorage.removeItem('authToken');
            const message = error.response?.data?.message || error.message || '登录失败';
            return rejectWithValue(message);
        }
    }
);

export const fetchUserOnLoad = createAsyncThunk<
    UserDetail,
    void,
    { state: RootState; rejectValue: string }
>(
    'auth/fetchUserOnLoad',
    async (_, { getState, rejectWithValue, dispatch }) => {
        const token = getState().auth.token;
        if (!token) {
            return rejectWithValue('未找到Token，无法获取用户信息');
        }
        try {
            const userProfile = await authApi.fetchUserProfile();
            return userProfile;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || '获取用户信息失败';
            dispatch(logoutUser()); // Ensure logoutUser is a sync action here for direct dispatch
            return rejectWithValue(message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logoutUser: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem('authToken');
        },
    },
    extraReducers: (builder) => {
        builder
            // Login User
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? '登录时发生未知错误'; // Ensure payload is not undefined
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
            })
            // Fetch User On Load
            .addCase(fetchUserOnLoad.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserOnLoad.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(fetchUserOnLoad.rejected, (state, action) => {
                state.isLoading = false;
                // logoutUser reducer (called from thunk) handles clearing user/token/isAuthenticated
                state.error = action.payload ?? '加载用户信息时发生未知错误';
            });
    },
});

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;