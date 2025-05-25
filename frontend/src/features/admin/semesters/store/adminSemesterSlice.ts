// src/features/admin/semesters/store/adminSemesterSlice.ts
//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { SemesterInfo, SemesterPayload } from '../../../../types'; // Adjust path
// Adjust path
import { adminSemesterApi } from '../services/adminSemesterApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store'; // Adjust path
// Adjust path

export interface AdminSemesterState {
    semesters: SemesterInfo[];
    isLoading: boolean;
    error: string | null; // Explicitly string or null
    totalCount: number;
    page: number;
    pageSize: number;
    isActivating: boolean;
}
// For create/update, omit id and isCurrent
// export interface SemesterPayload extends Omit<SemesterInfo, 'semesterId' | 'isCurrent'> {} // Already in types/index.ts
interface FetchAdminSemestersParams { page?: number; pageSize?: number; sort?: string; }


const initialState: AdminSemesterState = {
    semesters: [], isLoading: false, error: null, totalCount: 0, page: 0, pageSize: 10, isActivating: false,
};

// Thunks - Ensure rejectValue type is string for all
export const fetchAdminSemesters = createAsyncThunk<
    { semesters: SemesterInfo[], totalCount: number },
    FetchAdminSemestersParams,
    { state: RootState, rejectValue: string } // rejectValue is string
>(
    'adminSemesters/fetch', async (params, { getState, rejectWithValue }) => {
        const current = getState().adminSemesters;
        const queryParams = { page: params.page ?? current.page, pageSize: params.pageSize ?? current.pageSize, sort: params.sort };
        try {
            const response = await adminSemesterApi.getSemesters(queryParams);
            return { semesters: response.data, totalCount: response.totalCount };
        } catch (error: any) { // Catch 'any' type
            const message = error.response?.data?.message || error.message || '加载学期列表失败';
            return rejectWithValue(message); // Ensures payload is string
        }
    }
);
export const createAdminSemester = createAsyncThunk<
    SemesterInfo,
    SemesterPayload,
    { dispatch: GlobalAppDispatch, rejectValue: string } // rejectValue is string
>(
    'adminSemesters/create', async (payload, { dispatch, rejectWithValue }) => {
        try {
            const newSemester = await adminSemesterApi.createSemester(payload);
            dispatch(fetchAdminSemesters({ page: 0 }));
            return newSemester;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || '创建学期失败';
            return rejectWithValue(message);
        }
    }
);
export const updateAdminSemester = createAsyncThunk<
    SemesterInfo,
    { id: number; payload: Partial<SemesterPayload> },
    { rejectValue: string } // rejectValue is string
>(
    'adminSemesters/update', async ({ id, payload }, { rejectWithValue }) => {
        try {
            return await adminSemesterApi.updateSemester(id, payload);
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || '更新学期失败';
            return rejectWithValue(message);
        }
    }
);
export const deleteAdminSemester = createAsyncThunk<
    number,
    number,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string } // rejectValue is string
>(
    'adminSemesters/delete', async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminSemesterApi.deleteSemester(id);
            const { page, pageSize } = getState().adminSemesters;
            dispatch(fetchAdminSemesters({ page, pageSize }));
            return id;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || '删除学期失败';
            return rejectWithValue(message);
        }
    }
);
export const activateAdminSemester = createAsyncThunk<
    number,
    number,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string } // rejectValue is string
>(
    'adminSemesters/activate', async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminSemesterApi.activateSemester(id);
            const { page, pageSize } = getState().adminSemesters;
            dispatch(fetchAdminSemesters({ page, pageSize }));
            return id;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || '设置当前学期失败';
            return rejectWithValue(message);
        }
    }
);

const adminSemesterSlice = createSlice({
    name: 'adminSemesters',
    initialState,
    reducers: {
        setAdminSemesterPage: (state, action: PayloadAction<number>) => { state.page = action.payload; },
        setAdminSemesterPageSize: (state, action: PayloadAction<number>) => { state.pageSize = action.payload; state.page = 0; },
        clearAdminSemesterState: (state) => { Object.assign(state, initialState); }
    },
    extraReducers: (builder) => {
        const genericPendingHandler = (state: AdminSemesterState) => { state.isLoading = true; state.error = null; };
        // action.payload for rejected cases will now be string due to rejectValue type in thunks
        const genericRejectedHandler = (state: AdminSemesterState, action: PayloadAction<string | undefined>) => {
            state.isLoading = false; state.isActivating = false; // Also reset isActivating on any rejection
            state.error = action.payload ?? "发生未知错误"; // Use ?? to provide a default if payload is undefined
        };

        builder
            .addCase(fetchAdminSemesters.pending, genericPendingHandler)
            .addCase(fetchAdminSemesters.fulfilled, (state, action) => {
                state.isLoading = false; state.semesters = action.payload.semesters; state.totalCount = action.payload.totalCount;
                if (action.meta.arg.page !== undefined) state.page = action.meta.arg.page;
                if (action.meta.arg.pageSize !== undefined) state.pageSize = action.meta.arg.pageSize;
            })
            .addCase(fetchAdminSemesters.rejected, genericRejectedHandler)
            // Create
            .addCase(createAdminSemester.pending, genericPendingHandler)
            .addCase(createAdminSemester.fulfilled, (state) => { state.isLoading = false; /* list refreshed by thunk */ })
            .addCase(createAdminSemester.rejected, genericRejectedHandler)
            // Update
            .addCase(updateAdminSemester.pending, genericPendingHandler)
            .addCase(updateAdminSemester.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.semesters.findIndex(s => s.semesterId === action.payload.semesterId);
                if (index !== -1) state.semesters[index] = action.payload;
            })
            .addCase(updateAdminSemester.rejected, genericRejectedHandler)
            // Delete
            .addCase(deleteAdminSemester.pending, genericPendingHandler)
            .addCase(deleteAdminSemester.fulfilled, (state) => { state.isLoading = false; /* list refreshed by thunk */ })
            .addCase(deleteAdminSemester.rejected, genericRejectedHandler)
            // Activate
            .addCase(activateAdminSemester.pending, (state) => { state.isActivating = true; state.isLoading = true; state.error = null; }) // Also set isLoading
            .addCase(activateAdminSemester.fulfilled, (state) => { state.isActivating = false; state.isLoading = false; /* List refreshed by thunk */ })
            .addCase(activateAdminSemester.rejected, (state, action) => { // Use specific handler to reset isActivating
                state.isLoading = false;
                state.isActivating = false;
                state.error = action.payload ?? "发生未知错误";
            });
    },
});

export const { setAdminSemesterPage, setAdminSemesterPageSize, clearAdminSemesterState } = adminSemesterSlice.actions;
export default adminSemesterSlice.reducer;