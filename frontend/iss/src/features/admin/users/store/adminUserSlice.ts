//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { UserDetail, UserPayload, UserRole } from '../../../../types'; // Adjust path
// Adjust path
import { adminUserApi } from '../services/adminUserApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store'; // Adjust path for RootState & AppDispatch
// Adjust path for RootState & AppDispatch

// Define Params type for fetching with pagination/sort/filter
export interface FetchAdminUsersParams {
    page?: number;
    pageSize?: number;
    sort?: string; // e.g., "username,asc"
    filterRole?: UserRole | 'all';
    filterUsername?: string;
}

export interface AdminUserState {
    users: UserDetail[];
    isLoading: boolean;
    isSubmitting: boolean; // For create/update actions
    error: string | null;
    totalCount: number;
    page: number; // 0-based index for MUI DataGrid
    pageSize: number;
    filterRole: UserRole | 'all';
    filterUsername?: string; // Current username filter applied
}

const initialState: AdminUserState = {
    users: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    totalCount: 0,
    page: 0,
    pageSize: 10,
    filterRole: 'all',
    filterUsername: '',
};

// --- Async Thunks ---
export const fetchAdminUsers = createAsyncThunk<
    { users: UserDetail[], totalCount: number },
    FetchAdminUsersParams,
    { state: RootState, rejectValue: string }
>(
    'adminUsers/fetchAdminUsers',
    async (params, { getState, rejectWithValue }) => {
        const current = getState().adminUsers; // Use correct slice name 'adminUsers'
        const queryParams: FetchAdminUsersParams = {
            page: params.page ?? current.page,
            pageSize: params.pageSize ?? current.pageSize,
            sort: params.sort,
            filterRole: params.filterRole ?? current.filterRole,
            filterUsername: params.filterUsername !== undefined ? params.filterUsername : current.filterUsername,
        };
        try {
            const response = await adminUserApi.getUsers(queryParams);
            return { users: response.data, totalCount: response.totalCount };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '加载用户列表失败');
        }
    }
);

export const createAdminUser = createAsyncThunk<
    UserDetail,
    UserPayload,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminUsers/createAdminUser',
    async (payload, { dispatch, getState, rejectWithValue }) => {
        try {
            const newUser = await adminUserApi.createUser(payload);
            // Refresh to the first page with current filters
            const { pageSize, filterRole, filterUsername } = getState().adminUsers;
            dispatch(fetchAdminUsers({ page: 0, pageSize, filterRole, filterUsername }));
            return newUser;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '创建用户失败');
        }
    }
);

export const updateAdminUser = createAsyncThunk<
    UserDetail,
    { id: number; payload: Partial<UserPayload> }, // Payload can be partial for update
    { rejectValue: string }
>(
    'adminUsers/updateAdminUser',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const updatedUser = await adminUserApi.updateUser(id, payload);
            return updatedUser; // For local update in reducer
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '更新用户失败');
        }
    }
);

export const deleteAdminUser = createAsyncThunk<
    number, // Returns the deleted user ID
    number,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminUsers/deleteAdminUser',
    async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminUserApi.deleteUser(id);
            // Refresh with current page and filters
            const { page, pageSize, filterRole, filterUsername } = getState().adminUsers;
            dispatch(fetchAdminUsers({ page, pageSize, filterRole, filterUsername }));
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '删除用户失败');
        }
    }
);

// TODO: Consider a separate thunk for password reset if it's a distinct operation
// export const resetAdminUserPassword = createAsyncThunk(...)

const adminUserSlice = createSlice({
    name: 'adminUsers',
    initialState,
    reducers: {
        setAdminUserPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
        setAdminUserPageSize: (state, action: PayloadAction<number>) => {
            state.pageSize = action.payload;
            state.page = 0;
        },
        setAdminUserRoleFilter: (state, action: PayloadAction<UserRole | 'all'>) => {
            state.filterRole = action.payload;
            state.page = 0; // Reset page when filter changes
        },
        setAdminUserUsernameFilter: (state, action: PayloadAction<string>) => {
            state.filterUsername = action.payload;
            state.page = 0; // Reset page when filter changes
        },
        clearAdminUserState: (state) => { // For logout
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Users
            .addCase(fetchAdminUsers.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAdminUsers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.users = action.payload.users;
                state.totalCount = action.payload.totalCount;
                // Update pagination and filter state from thunk arguments if they were the source of truth for this fetch
                const params = action.meta.arg;
                if (params.page !== undefined) state.page = params.page;
                if (params.pageSize !== undefined) state.pageSize = params.pageSize;
                if (params.filterRole !== undefined) state.filterRole = params.filterRole;
                if (params.filterUsername !== undefined) state.filterUsername = params.filterUsername;
            })
            .addCase(fetchAdminUsers.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

            // Create User
            .addCase(createAdminUser.pending, (state) => { state.isSubmitting = true; state.error = null; })
            .addCase(createAdminUser.fulfilled, (state) => { state.isSubmitting = false; /* List is refreshed by thunk */ })
            .addCase(createAdminUser.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

            // Update User
            .addCase(updateAdminUser.pending, (state) => { state.isSubmitting = true; state.error = null; })
            .addCase(updateAdminUser.fulfilled, (state, action) => {
                state.isSubmitting = false;
                const index = state.users.findIndex(u => u.userId === action.payload.userId);
                if (index !== -1) {
                    state.users[index] = action.payload;
                }
            })
            .addCase(updateAdminUser.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

            // Delete User
            .addCase(deleteAdminUser.pending, (state) => { state.isSubmitting = true; state.error = null; }) // Use isSubmitting for delete as well
            .addCase(deleteAdminUser.fulfilled, (state) => { state.isSubmitting = false; /* List is refreshed by thunk */ })
            .addCase(deleteAdminUser.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; });
    },
});

export const {
    setAdminUserPage,
    setAdminUserPageSize,
    setAdminUserRoleFilter,
    setAdminUserUsernameFilter,
    clearAdminUserState,
} = adminUserSlice.actions;
export default adminUserSlice.reducer;