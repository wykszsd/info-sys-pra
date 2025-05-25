//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Schedule, SchedulePayload } from '../../../../types';
import { adminScheduleApi } from '../services/adminScheduleApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store';

export interface FetchAdminSchedulesParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filterCourseId?: number | null;
    filterTeacherId?: string | null;
    filterClassroomId?: number | null;
    filterSemesterId?: number | null;
}

export interface AdminScheduleState {
    schedules: Schedule[];
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    totalCount: number;
    page: number;
    pageSize: number;
    filterCourseId?: number | null;
    filterTeacherId?: string | null;
    filterClassroomId?: number | null;
    filterSemesterId?: number | null;
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
    filterSemesterId: null,
};

export const fetchAdminSchedules = createAsyncThunk<
    { schedules: Schedule[], totalCount: number },
    FetchAdminSchedulesParams, // Thunk parameters
    { state: RootState, rejectValue: string }
>(
    'adminSchedules/fetchAdminSchedules',
    async (thunkParams, { getState, rejectWithValue }) => {
        const currentSliceState = getState().adminSchedules;
        const apiParams: FetchAdminSchedulesParams = {
            page: thunkParams.page !== undefined ? thunkParams.page : currentSliceState.page,
            pageSize: thunkParams.pageSize !== undefined ? thunkParams.pageSize : currentSliceState.pageSize,
            sort: thunkParams.sort,
            filterCourseId: thunkParams.filterCourseId !== undefined ? thunkParams.filterCourseId : currentSliceState.filterCourseId,
            filterTeacherId: thunkParams.filterTeacherId !== undefined ? thunkParams.filterTeacherId : currentSliceState.filterTeacherId,
            filterClassroomId: thunkParams.filterClassroomId !== undefined ? thunkParams.filterClassroomId : currentSliceState.filterClassroomId,
            filterSemesterId: thunkParams.filterSemesterId !== undefined ? thunkParams.filterSemesterId : currentSliceState.filterSemesterId,
        };
        try {
            const response = await adminScheduleApi.getSchedules(apiParams);
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
            const currentStoreState = getState().adminSchedules; // Renamed for clarity
            dispatch(fetchAdminSchedules({
                page: 0, // Reset to first page after creation
                pageSize: currentStoreState.pageSize,
                filterCourseId: currentStoreState.filterCourseId,
                filterTeacherId: currentStoreState.filterTeacherId,
                filterClassroomId: currentStoreState.filterClassroomId,
                filterSemesterId: currentStoreState.filterSemesterId,
                // No sort parameter needed here, will use default or existing if any
            }));
            return newSchedule; // This payload isn't directly used to update list, fetch does.
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '创建排课失败');
        }
    }
);

export const updateAdminSchedule = createAsyncThunk<
    Schedule, // Returns the updated schedule
    { id: number; payload: Partial<SchedulePayload> },
    { rejectValue: string }
>(
    'adminSchedules/updateAdminSchedule',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const updatedSchedule = await adminScheduleApi.updateSchedule(id, payload);
            return updatedSchedule;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '更新排课失败');
        }
    }
);

export const deleteAdminSchedule = createAsyncThunk<
    number, // Returns the ID of the deleted schedule
    number, // Argument is the ID to delete
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminSchedules/deleteAdminSchedule',
    async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminScheduleApi.deleteSchedule(id);
            const currentStoreState = getState().adminSchedules;
            // Check if the current page becomes empty after deletion
            const newPage = (currentStoreState.schedules.length === 1 && currentStoreState.page > 0)
                ? currentStoreState.page - 1
                : currentStoreState.page;

            dispatch(fetchAdminSchedules({
                page: newPage, // Use potentially adjusted page
                pageSize: currentStoreState.pageSize,
                filterCourseId: currentStoreState.filterCourseId,
                filterTeacherId: currentStoreState.filterTeacherId,
                filterClassroomId: currentStoreState.filterClassroomId,
                filterSemesterId: currentStoreState.filterSemesterId,
            }));
            return id; // This payload isn't directly used to update list, fetch does.
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '删除排课失败');
        }
    }
);

const adminScheduleSlice = createSlice({
    name: 'adminSchedules',
    initialState,
    reducers: {
        setAdminSchedulePage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
        setAdminSchedulePageSize: (state, action: PayloadAction<number>) => {
            state.pageSize = action.payload;
            state.page = 0; // Reset to first page when page size changes
        },
        setAdminScheduleFilters: (state, action: PayloadAction<Partial<Pick<AdminScheduleState, 'filterCourseId' | 'filterTeacherId' | 'filterClassroomId' | 'filterSemesterId'>>>) => {
            // Update filters selectively
            if (action.payload.hasOwnProperty('filterCourseId')) {
                state.filterCourseId = action.payload.filterCourseId;
            }
            if (action.payload.hasOwnProperty('filterTeacherId')) {
                state.filterTeacherId = action.payload.filterTeacherId;
            }
            if (action.payload.hasOwnProperty('filterClassroomId')) {
                state.filterClassroomId = action.payload.filterClassroomId;
            }
            if (action.payload.hasOwnProperty('filterSemesterId')) {
                state.filterSemesterId = action.payload.filterSemesterId;
            }
            state.page = 0; // Reset page when any filter changes
        },
        clearAdminScheduleState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdminSchedules.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAdminSchedules.fulfilled, (state, action) => {
                state.isLoading = false;
                state.schedules = action.payload.schedules;
                state.totalCount = action.payload.totalCount;
                state.error = null;
                // DO NOT update state.page, state.pageSize, or filters from action.meta.arg here.
                // These are managed by their respective reducers (setAdminSchedulePage, etc.)
                // and the thunk should fetch based on the *current* state of these.
                // The `action.meta.arg` reflects what was PASSED to the thunk,
                // but the source of truth for these params IS the state itself.
                // This was a source of potential loops.
                const params = action.meta.arg;
                // We can, however, ensure the state reflects the page/pageSize that was *actually* used for the fetch
                // if it was explicitly passed to the thunk. But usually, the thunk relies on state for these.
                // For simplicity and to avoid loops, it's safer to let setAdminSchedulePage/Size reducers be the sole updaters.
                if (params.page !== undefined) state.page = params.page;
                if (params.pageSize !== undefined) state.pageSize = params.pageSize;
                // Filters are also best managed by their dedicated reducer
            })
            .addCase(fetchAdminSchedules.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? '加载排课列表失败';
            })

            .addCase(createAdminSchedule.pending, (state) => {
                state.isSubmitting = true;
                state.error = null;
            })
            .addCase(createAdminSchedule.fulfilled, (state) => {
                state.isSubmitting = false;
                // List is refreshed by the fetchAdminSchedules call within the thunk
            })
            .addCase(createAdminSchedule.rejected, (state, action) => {
                state.isSubmitting = false;
                state.error = action.payload ?? '创建排课失败';
            })

            .addCase(updateAdminSchedule.pending, (state) => {
                state.isSubmitting = true;
                state.error = null;
            })
            .addCase(updateAdminSchedule.fulfilled, (state, action) => {
                state.isSubmitting = false;
                const index = state.schedules.findIndex(s => s.scheduleId === action.payload.scheduleId);
                if (index !== -1) {
                    state.schedules[index] = action.payload;
                }
                // Optionally, could re-fetch the whole list if server-side changes affect sorting/pagination significantly
                // dispatch(fetchAdminSchedules({ page: state.page, pageSize: state.pageSize, ...currentFilters }))
            })
            .addCase(updateAdminSchedule.rejected, (state, action) => {
                state.isSubmitting = false;
                state.error = action.payload ?? '更新排课失败';
            })

            .addCase(deleteAdminSchedule.pending, (state) => {
                state.isSubmitting = true;
                state.error = null;
            })
            .addCase(deleteAdminSchedule.fulfilled, (state) => {
                state.isSubmitting = false;
                // List is refreshed by the fetchAdminSchedules call within the thunk
            })
            .addCase(deleteAdminSchedule.rejected, (state, action) => {
                state.isSubmitting = false;
                state.error = action.payload ?? '删除排课失败';
            });
    },
});

export const {
    setAdminSchedulePage,
    setAdminSchedulePageSize,
    setAdminScheduleFilters,
    clearAdminScheduleState
} = adminScheduleSlice.actions;
export default adminScheduleSlice.reducer;