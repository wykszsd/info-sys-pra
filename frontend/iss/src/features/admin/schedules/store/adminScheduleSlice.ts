//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Schedule, SchedulePayload } from '../../../../types'; // Adjust path
// Adjust path
import { adminScheduleApi } from '../services/adminScheduleApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store'; // Adjust path
// Adjust path

// Params for fetching schedules
export interface FetchAdminSchedulesParams {
    page?: number;
    pageSize?: number;
    sort?: string; // e.g., "courseName,asc"
    filterCourseId?: number | null;
    filterTeacherId?: string | null;
    filterClassroomId?: number | null;
    filterSemesterId?: number | null; // Important for filtering by semester
    // Add other filters like weekDay, sectionId if needed
}

export interface AdminScheduleState {
    schedules: Schedule[]; // These schedules should have resolved names for display
    isLoading: boolean;
    isSubmitting: boolean; // For CUD operations
    error: string | null;
    totalCount: number;
    page: number;
    pageSize: number;
    // Filters
    filterCourseId?: number | null;
    filterTeacherId?: string | null;
    filterClassroomId?: number | null;
    filterSemesterId?: number | null; // Current semester to filter by
}

const initialState: AdminScheduleState = {
    schedules: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    totalCount: 0,
    page: 0,
    pageSize: 10,
    filterCourseId: null,
    filterTeacherId: null,
    filterClassroomId: null,
    filterSemesterId: null, // Will be set from current semester in timetableSlice or a selector
};

// Async Thunks
export const fetchAdminSchedules = createAsyncThunk<
    { schedules: Schedule[], totalCount: number },
    FetchAdminSchedulesParams,
    { state: RootState, rejectValue: string }
>(
    'adminSchedules/fetchAdminSchedules',
    async (params, { getState, rejectWithValue }) => {
        const current = getState().adminSchedules;
        // If filterSemesterId is not passed, try to use current semester from timetable or a global setting
        const semesterToFilter = params.filterSemesterId !== undefined ? params.filterSemesterId : current.filterSemesterId ?? getState().timetable.currentSemester?.semesterId;

        const queryParams: FetchAdminSchedulesParams = {
            page: params.page ?? current.page,
            pageSize: params.pageSize ?? current.pageSize,
            sort: params.sort,
            filterCourseId: params.filterCourseId !== undefined ? params.filterCourseId : current.filterCourseId,
            filterTeacherId: params.filterTeacherId !== undefined ? params.filterTeacherId : current.filterTeacherId,
            filterClassroomId: params.filterClassroomId !== undefined ? params.filterClassroomId : current.filterClassroomId,
            filterSemesterId: semesterToFilter, // Ensure this is passed to API
        };
        try {
            const response = await adminScheduleApi.getSchedules(queryParams);
            return { schedules: response.data, totalCount: response.totalCount };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '加载排课列表失败');
        }
    }
);

export const createAdminSchedule = createAsyncThunk<
    Schedule,
    SchedulePayload,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminSchedules/createAdminSchedule',
    async (payload, { dispatch, getState, rejectWithValue }) => {
        try {
            const newSchedule = await adminScheduleApi.createSchedule(payload);
            const currentFilters = getState().adminSchedules;
            dispatch(fetchAdminSchedules({ // Refresh with current filters and first page
                page: 0, pageSize: currentFilters.pageSize,
                filterCourseId: currentFilters.filterCourseId,
                filterTeacherId: currentFilters.filterTeacherId,
                filterClassroomId: currentFilters.filterClassroomId,
                filterSemesterId: currentFilters.filterSemesterId,
            }));
            return newSchedule;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '创建排课失败');
        }
    }
);

export const updateAdminSchedule = createAsyncThunk<
    Schedule,
    { id: number; payload: Partial<SchedulePayload> },
    { rejectValue: string }
>(
    'adminSchedules/updateAdminSchedule',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const updatedSchedule = await adminScheduleApi.updateSchedule(id, payload);
            return updatedSchedule; // For local update
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '更新排课失败');
        }
    }
);

export const deleteAdminSchedule = createAsyncThunk<
    number, // Returns deleted ID
    number,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminSchedules/deleteAdminSchedule',
    async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminScheduleApi.deleteSchedule(id);
            const currentFilters = getState().adminSchedules; // Refresh with current view
            dispatch(fetchAdminSchedules({
                page: currentFilters.page, pageSize: currentFilters.pageSize, /* Pass other current filters */
                filterCourseId: currentFilters.filterCourseId,
                filterTeacherId: currentFilters.filterTeacherId,
                filterClassroomId: currentFilters.filterClassroomId,
                filterSemesterId: currentFilters.filterSemesterId,
            }));
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '删除排课失败');
        }
    }
);

const adminScheduleSlice = createSlice({
    name: 'adminSchedules',
    initialState,
    reducers: {
        setAdminSchedulePage: (state, action: PayloadAction<number>) => { state.page = action.payload; },
        setAdminSchedulePageSize: (state, action: PayloadAction<number>) => { state.pageSize = action.payload; state.page = 0; },
        setAdminScheduleFilters: (state, action: PayloadAction<Partial<Pick<AdminScheduleState, 'filterCourseId' | 'filterTeacherId' | 'filterClassroomId' | 'filterSemesterId'>>>) => {
            state.filterCourseId = action.payload.filterCourseId !== undefined ? action.payload.filterCourseId : state.filterCourseId;
            state.filterTeacherId = action.payload.filterTeacherId !== undefined ? action.payload.filterTeacherId : state.filterTeacherId;
            state.filterClassroomId = action.payload.filterClassroomId !== undefined ? action.payload.filterClassroomId : state.filterClassroomId;
            state.filterSemesterId = action.payload.filterSemesterId !== undefined ? action.payload.filterSemesterId : state.filterSemesterId;
            state.page = 0;
        },
        clearAdminScheduleState: (state) => { Object.assign(state, initialState); }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchAdminSchedules.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAdminSchedules.fulfilled, (state, action) => {
                state.isLoading = false;
                state.schedules = action.payload.schedules;
                state.totalCount = action.payload.totalCount;
                const params = action.meta.arg;
                if (params.page !== undefined) state.page = params.page;
                if (params.pageSize !== undefined) state.pageSize = params.pageSize;
                if (params.filterCourseId !== undefined) state.filterCourseId = params.filterCourseId;
                if (params.filterTeacherId !== undefined) state.filterTeacherId = params.filterTeacherId;
                if (params.filterClassroomId !== undefined) state.filterClassroomId = params.filterClassroomId;
                if (params.filterSemesterId !== undefined) state.filterSemesterId = params.filterSemesterId;
            })
            .addCase(fetchAdminSchedules.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
            // Create
            .addCase(createAdminSchedule.pending, (state) => { state.isSubmitting = true; state.error = null; })
            .addCase(createAdminSchedule.fulfilled, (state) => { state.isSubmitting = false; /* List refreshed by thunk */ })
            .addCase(createAdminSchedule.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })
            // Update
            .addCase(updateAdminSchedule.pending, (state) => { state.isSubmitting = true; state.error = null; })
            .addCase(updateAdminSchedule.fulfilled, (state, action) => {
                state.isSubmitting = false;
                const index = state.schedules.findIndex(s => s.scheduleId === action.payload.scheduleId);
                if (index !== -1) state.schedules[index] = action.payload;
            })
            .addCase(updateAdminSchedule.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })
            // Delete
            .addCase(deleteAdminSchedule.pending, (state) => { state.isSubmitting = true; state.error = null; })
            .addCase(deleteAdminSchedule.fulfilled, (state) => { state.isSubmitting = false; /* List refreshed by thunk */ })
            .addCase(deleteAdminSchedule.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; });
    },
});

export const {
    setAdminSchedulePage,
    setAdminSchedulePageSize,
    setAdminScheduleFilters,
    clearAdminScheduleState
} = adminScheduleSlice.actions;
export default adminScheduleSlice.reducer;