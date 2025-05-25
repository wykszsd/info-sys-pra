// src/features/classrooms/store/classroomSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { ClassroomState, EmptyClassroomQuery, AvailableClassroom } from '../../../types';
import { classroomApi } from '../services/classroomApi';
import type { RootState } from '../../../store';

const initialState: ClassroomState = {
    query: {
        sectionIds: [],
    },
    availableClassrooms: [],
    buildings: [],
    isLoading: false,
    error: null, // Initialized
    hasLoadedBuildings: false, // <-- Add this
};

export const fetchBuildingNamesList = createAsyncThunk<string[], void, { state: RootState, rejectValue: string }>(
    'classrooms/fetchBuildingNamesList',
    async (_, { rejectWithValue }) => {
        // Condition removed, page component will use hasLoadedBuildings
        try {
            const buildings = await classroomApi.getBuildingNames();
            return buildings.sort();
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载教学楼列表');
        }
    }
);

export const findAvailableClassrooms = createAsyncThunk<AvailableClassroom[], EmptyClassroomQuery, { rejectValue: string }>(
    'classrooms/findAvailable',
    async (query, { rejectWithValue }) => {
        if (!query.startDate || !query.endDate || query.sectionIds.length === 0) {
            return rejectWithValue('请选择完整的日期范围和至少一个节次。');
        }
        try {
            return await classroomApi.findEmptyClassrooms(query);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '查询空教室失败');
        }
    }
);

const classroomSlice = createSlice({
    name: 'classrooms',
    initialState,
    reducers: {
        updateClassroomQuery: (state, action: PayloadAction<Partial<EmptyClassroomQuery>>) => {
            state.query = { ...state.query, ...action.payload };
            state.error = null;
        },
        clearClassroomSearch: (state) => {
            state.query = { sectionIds: [] };
            state.availableClassrooms = [];
            state.error = null;
        },
        clearClassroomsState: (state) => { // For logout
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBuildingNamesList.pending, (state) => {
                state.isLoading = true; /* Could be more granular */
                // state.hasLoadedBuildings = false; // Optional reset
            })
            .addCase(fetchBuildingNamesList.fulfilled, (state, action) => {
                state.buildings = action.payload;
                state.hasLoadedBuildings = true; // Set loaded flag
                // If this is the only initial load for this slice, set isLoading to false
                // This logic might need adjustment based on how isLoading is used globally for this slice.
                // If findAvailableClassrooms also sets isLoading, this might be okay.
                if (!state.query.startDate) state.isLoading = false;
            })
            .addCase(fetchBuildingNamesList.rejected, (state, action) => {
                state.isLoading = false;
                state.error = (state.error ? state.error + '; ' : '') + `教学楼: ${action.payload ?? '未知错误'}`;
                state.hasLoadedBuildings = true; // Mark as attempted
            })
            .addCase(findAvailableClassrooms.pending, (state) => {
                state.isLoading = true; state.error = null; state.availableClassrooms = [];
            })
            .addCase(findAvailableClassrooms.fulfilled, (state, action) => {
                state.isLoading = false; state.availableClassrooms = action.payload;
            })
            .addCase(findAvailableClassrooms.rejected, (state, action) => {
                state.isLoading = false; state.error = action.payload ?? '查询未知错误';
                state.availableClassrooms = [];
            });
    },
});

export const { updateClassroomQuery, clearClassroomSearch, clearClassroomsState } = classroomSlice.actions;
export default classroomSlice.reducer;