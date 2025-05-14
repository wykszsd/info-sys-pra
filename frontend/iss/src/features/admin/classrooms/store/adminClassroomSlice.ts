//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Classroom } from '../../../../types'; // Adjust path
// Adjust path
import { adminClassroomApi } from '../services/adminClassroomApi';
import type { RootState } from '../../../../store'; // Adjust path
// Adjust path
import { store } from '../../../../store'; // Adjust path for AppDispatch

// Define AppDispatch type for thunks if not globally available
type AppDispatch = typeof store.dispatch;

// Helper function to safely extract error messages
function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null) {
        const errAsObject = error as { response?: unknown; message?: unknown };

        if (typeof errAsObject.response === 'object' && errAsObject.response !== null) {
            const responseAsObject = errAsObject.response as { data?: unknown };
            if (typeof responseAsObject.data === 'object' && responseAsObject.data !== null) {
                const dataAsObject = responseAsObject.data as { message?: unknown };
                if (typeof dataAsObject.message === 'string') {
                    return dataAsObject.message;
                }
            }
        }
        if (typeof errAsObject.message === 'string') {
            return errAsObject.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return defaultMessage;
}

// Define GetClassroomsParams
interface GetClassroomsParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filter?: {
        building_like?: string;
        equipment_eq?: Classroom['equipment'] | ''; // API expects this or undefined
    };
}

export interface AdminClassroomState {
    classrooms: Classroom[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    page: number;
    pageSize: number;
    filterBuilding?: string; // In state, can be string (incl. '') or undefined
    filterEquipment?: Classroom['equipment'] | '' | null; // In state, can be string (incl. ''), null, or undefined
}

export interface ClassroomPayload extends Omit<Classroom, 'classroomId'> { }

const initialState: AdminClassroomState = {
    classrooms: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    page: 0,
    pageSize: 10,
    filterBuilding: '', // Initialize to empty string, consistent with undefined being "all"
    filterEquipment: '', // Initialize to empty string, consistent with null/undefined being "all"
};

// Async Thunks
export const fetchAdminClassrooms = createAsyncThunk<
    { classrooms: Classroom[], totalCount: number },
    GetClassroomsParams, // Parameters passed TO the thunk
    { state: RootState, rejectValue: string }
>(
    'adminClassrooms/fetchAdminClassrooms',
    async (params, { getState, rejectWithValue }) => {
        const current = getState().adminClassrooms;
        // Parameters sent TO THE API
        const queryParams: GetClassroomsParams = {
            page: params.page ?? current.page,
            pageSize: params.pageSize ?? current.pageSize,
            sort: params.sort, // sort can be undefined
            filter: params.filter ? { // If params.filter exists, use it, otherwise construct from state
                building_like: params.filter.building_like ?? (current.filterBuilding || undefined),
                equipment_eq: params.filter.equipment_eq ?? (current.filterEquipment === null ? undefined : (current.filterEquipment || undefined))
            } : { // Construct filter from state if params.filter is not provided
                building_like: current.filterBuilding || undefined,
                equipment_eq: current.filterEquipment === null ? undefined : (current.filterEquipment || undefined)
            }
        };
        // Ensure filter object is not sent if all its properties are undefined
        if (queryParams.filter && Object.values(queryParams.filter).every(v => v === undefined)) {
            delete queryParams.filter;
        }

        try {
            const response = await adminClassroomApi.getClassrooms(queryParams);
            return { classrooms: response.data, totalCount: response.totalCount };
        } catch (err: unknown) {
            return rejectWithValue(getErrorMessage(err, '加载教室列表失败'));
        }
    }
);

export const createAdminClassroom = createAsyncThunk<
    Classroom,
    ClassroomPayload,
    { dispatch: AppDispatch, rejectValue: string }
>(
    'adminClassrooms/createAdminClassroom',
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const newClassroom = await adminClassroomApi.createClassroom(payload);
            dispatch(fetchAdminClassrooms({ page: 0 }));
            return newClassroom;
        } catch (err: unknown) {
            return rejectWithValue(getErrorMessage(err, '创建教室失败'));
        }
    }
);

export const updateAdminClassroom = createAsyncThunk<
    Classroom,
    { id: number; payload: Partial<ClassroomPayload> },
    { rejectValue: string }
>(
    'adminClassrooms/updateAdminClassroom',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const updatedClassroom = await adminClassroomApi.updateClassroom(id, payload);
            return updatedClassroom;
        } catch (err: unknown) {
            return rejectWithValue(getErrorMessage(err, '更新教室失败'));
        }
    }
);

export const deleteAdminClassroom = createAsyncThunk<
    number,
    number,
    { dispatch: AppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminClassrooms/deleteAdminClassroom',
    async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminClassroomApi.deleteClassroom(id);
            const { page, pageSize, filterBuilding, filterEquipment } = getState().adminClassrooms;
            // Construct parameters for fetchAdminClassrooms after delete
            const fetchParams: GetClassroomsParams = {
                page,
                pageSize,
                filter: {
                    building_like: filterBuilding || undefined,
                    equipment_eq: filterEquipment === null ? undefined : (filterEquipment || undefined)
                }
            };
            if (fetchParams.filter && Object.values(fetchParams.filter).every(v => v === undefined)) {
                delete fetchParams.filter;
            }
            dispatch(fetchAdminClassrooms(fetchParams));
            return id;
        } catch (err: unknown) { // THIS IS WHERE THE ERROR AT LINE 144 WAS
            return rejectWithValue(getErrorMessage(err, '删除教室失败'));
        }
    }
);

const adminClassroomSlice = createSlice({
    name: 'adminClassrooms',
    initialState,
    reducers: {
        setAdminClassroomPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
        setAdminClassroomPageSize: (state, action: PayloadAction<number>) => {
            state.pageSize = action.payload;
            state.page = 0;
        },
        setAdminClassroomFilters: (state, action: PayloadAction<{ building?: string; equipment?: Classroom['equipment'] | '' | null }>) => {
            // For building: if payload.building is undefined, keep current; otherwise update.
            // If payload.building is '', it becomes ''.
            if (action.payload.building !== undefined) {
                state.filterBuilding = action.payload.building;
            }
            // For equipment: if payload.equipment is undefined, keep current; otherwise update.
            // Allows setting to string, '', or null.
            if (action.payload.equipment !== undefined) {
                state.filterEquipment = action.payload.equipment;
            }
            state.page = 0;
        },
        clearAdminClassroomState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchAdminClassrooms.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAdminClassrooms.fulfilled, (state, action) => {
                state.isLoading = false;
                state.classrooms = action.payload.classrooms;
                state.totalCount = action.payload.totalCount;
                state.error = null; // Clear error on success

                // Update state based on arguments passed to the thunk for pagination and filters
                if (action.meta.arg.page !== undefined) {
                    state.page = action.meta.arg.page;
                }
                if (action.meta.arg.pageSize !== undefined) {
                    state.pageSize = action.meta.arg.pageSize;
                }

                // Handle filterBuilding update from action arguments
                if (action.meta.arg.filter?.hasOwnProperty('building_like')) {
                    state.filterBuilding = action.meta.arg.filter.building_like ?? ''; // Map undefined from action to '' for state
                }

                // Handle filterEquipment update from action arguments (FIXED for LINE 219 ERROR)
                if (action.meta.arg.filter?.hasOwnProperty('equipment_eq')) {
                    const equipmentValueFromAction = action.meta.arg.filter.equipment_eq;
                    // action.meta.arg.filter.equipment_eq is Classroom['equipment'] | '' | undefined
                    // state.filterEquipment is Classroom['equipment'] | '' | null | undefined
                    if (equipmentValueFromAction === undefined) {
                        state.filterEquipment = null; // Explicitly map undefined from action's filter to null in state
                    } else {
                        // equipmentValueFromAction is Classroom['equipment'] | ''
                        state.filterEquipment = equipmentValueFromAction;
                    }
                }
            })
            .addCase(fetchAdminClassrooms.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
            // Create
            .addCase(createAdminClassroom.pending, (state) => { state.isLoading = true; })
            .addCase(createAdminClassroom.fulfilled, (state) => { state.isLoading = false; state.error = null; })
            .addCase(createAdminClassroom.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
            // Update
            .addCase(updateAdminClassroom.pending, (state) => { state.isLoading = true; })
            .addCase(updateAdminClassroom.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                const index = state.classrooms.findIndex(c => c.classroomId === action.payload.classroomId);
                if (index !== -1) state.classrooms[index] = action.payload;
            })
            .addCase(updateAdminClassroom.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
            // Delete
            .addCase(deleteAdminClassroom.pending, (state) => { state.isLoading = true; })
            .addCase(deleteAdminClassroom.fulfilled, (state) => { state.isLoading = false; state.error = null; })
            .addCase(deleteAdminClassroom.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; });
    },
});

export const {
    setAdminClassroomPage,
    setAdminClassroomPageSize,
    setAdminClassroomFilters,
    clearAdminClassroomState,
} = adminClassroomSlice.actions;
export default adminClassroomSlice.reducer;