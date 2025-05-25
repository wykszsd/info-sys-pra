// src/store/sharedDataSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Course, TeacherInfo, Classroom } from '../types'; // Adjust path as needed
import { sharedDataApi } from '../services/sharedDataApi'; // Adjust path as needed
import type { RootState } from './index'; // For getState type in thunks

export interface SharedDataState {
    allCoursesShort: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    allTeachers: TeacherInfo[];
    allClassroomsShort: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    isLoading: {
        courses: boolean;
        teachers: boolean;
        classrooms: boolean;
    };
    error: string | null;
    hasLoadedCoursesShort: boolean; // New
    hasLoadedTeachers: boolean; // New
    hasLoadedClassroomsShort: boolean; // New
}

const initialState: SharedDataState = {
    allCoursesShort: [],
    allTeachers: [],
    allClassroomsShort: [],
    isLoading: {
        courses: false,
        teachers: false,
        classrooms: false,
    },
    error: null,
    hasLoadedCoursesShort: false, // Initialize
    hasLoadedTeachers: false, // Initialize
    hasLoadedClassroomsShort: false, // Initialize
};

export const fetchAllCoursesShortList = createAsyncThunk<
    Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[],
    void,
    { state: RootState; rejectValue: string }
>(
    'sharedData/fetchAllCoursesShortList',
    async (_, { rejectWithValue }) => {
        try {
            const courses = await sharedDataApi.getAllCoursesShort();
            return courses.sort((a, b) => a.courseName.localeCompare(b.courseName));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载课程列表');
        }
    }
);

export const fetchAllTeachersList = createAsyncThunk<
    TeacherInfo[],
    void,
    { state: RootState; rejectValue: string }
>(
    'sharedData/fetchAllTeachersList',
    async (_, { rejectWithValue }) => {
        try {
            const teachers = await sharedDataApi.getAllTeachers();
            return teachers.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载教师列表');
        }
    }
);

export const fetchAllClassroomsShortList = createAsyncThunk<
    Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[],
    void,
    { state: RootState; rejectValue: string }
>(
    'sharedData/fetchAllClassroomsShortList',
    async (_, { rejectWithValue }) => {
        try {
            const classrooms = await sharedDataApi.getAllClassroomsList();
            console.log(classrooms);
            return classrooms.sort((a, b) => `${a.building} ${a.roomNumber}`.localeCompare(`${b.building} ${b.roomNumber}`));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载教室列表');
        }
    }
);

const sharedDataSlice = createSlice({
    name: 'sharedData',
    initialState,
    reducers: {
        clearSharedDataState: (state) => { // For logout
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        const appendError = (currentError: string | null, newError: string | undefined): string => {
            if (!newError) return currentError || '';
            return (currentError ? currentError + '; ' : '') + newError;
        };

        builder.addCase(fetchAllCoursesShortList.pending, (state) => {
            state.isLoading.courses = true;
            state.error = null;
            // state.hasLoadedCoursesShort = false; // Optional reset
        })
            .addCase(fetchAllCoursesShortList.fulfilled, (state, action) => {
                state.isLoading.courses = false;
                state.allCoursesShort = action.payload;
                state.hasLoadedCoursesShort = true; // Set loaded flag
            })
            .addCase(fetchAllCoursesShortList.rejected, (state, action) => {
                state.isLoading.courses = false;
                state.error = appendError(state.error, `课程列表: ${action.payload ?? '未知错误'}`);
                state.hasLoadedCoursesShort = true; // Mark as attempted
            });

        builder.addCase(fetchAllTeachersList.pending, (state) => {
            state.isLoading.teachers = true;
            state.error = null;
            // state.hasLoadedTeachers = false; // Optional reset
        })
            .addCase(fetchAllTeachersList.fulfilled, (state, action) => {
                state.isLoading.teachers = false;
                state.allTeachers = action.payload;
                state.hasLoadedTeachers = true; // Set loaded flag
            })
            .addCase(fetchAllTeachersList.rejected, (state, action) => {
                state.isLoading.teachers = false;
                state.error = appendError(state.error, `教师列表: ${action.payload ?? '未知错误'}`);
                state.hasLoadedTeachers = true; // Mark as attempted
            });

        builder.addCase(fetchAllClassroomsShortList.pending, (state) => {
            state.isLoading.classrooms = true;
            state.error = null;
            // state.hasLoadedClassroomsShort = false; // Optional reset
        })
            .addCase(fetchAllClassroomsShortList.fulfilled, (state, action) => {
                state.isLoading.classrooms = false;
                state.allClassroomsShort = action.payload;
                state.hasLoadedClassroomsShort = true; // Set loaded flag
            })
            .addCase(fetchAllClassroomsShortList.rejected, (state, action) => {
                state.isLoading.classrooms = false;
                state.error = appendError(state.error, `教室列表: ${action.payload ?? '未知错误'}`);
                state.hasLoadedClassroomsShort = true; // Mark as attempted
            });
    },
});

export const { clearSharedDataState } = sharedDataSlice.actions;
export default sharedDataSlice.reducer;