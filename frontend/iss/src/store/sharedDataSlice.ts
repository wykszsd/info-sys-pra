import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Course, TeacherInfo, Classroom } from '../types'; // Adjust path as needed
// Adjust path as needed
import { sharedDataApi } from '../services/sharedDataApi'; // Adjust path as needed
import type { RootState } from './index'; // For getState type in thunks
// For getState type in thunks

// State interface for this slice
export interface SharedDataState {
    allCoursesShort: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    allTeachers: TeacherInfo[]; // TeacherInfo should include teacherId and name
    allClassroomsShort: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    // Sections are typically loaded via timetableSlice for timetable display,
    // but if needed for other forms without timetable context, they can be added here.
    // allSections: ClassSection[];
    isLoading: { // Individual loading states for each data type
        courses: boolean;
        teachers: boolean;
        classrooms: boolean;
        // sections: boolean;
    };
    error: string | null; // Consolidated error message for shared data fetching
}

const initialState: SharedDataState = {
    allCoursesShort: [],
    allTeachers: [],
    allClassroomsShort: [],
    // allSections: [],
    isLoading: {
        courses: false,
        teachers: false,
        classrooms: false,
        // sections: false,
    },
    error: null,
};

// --- Async Thunks ---

// Fetch a lightweight list of all courses (id, name, code)
export const fetchAllCoursesShortList = createAsyncThunk<
    Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[],
    void, // No arguments needed for this thunk
    { state: RootState; rejectValue: string } // ThunkAPI config
>(
    'sharedData/fetchAllCoursesShortList', // Action type prefix
    async (_, { getState, rejectWithValue }) => {
        // Basic caching: if data exists and not currently loading, return existing data
        const { allCoursesShort, isLoading } = getState().sharedData;
        if (allCoursesShort.length > 0 && !isLoading.courses) {
            return allCoursesShort;
        }
        try {
            const courses = await sharedDataApi.getAllCoursesShort();
            return courses.sort((a, b) => a.courseName.localeCompare(b.courseName)); // Sort for better UX
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载课程列表');
        }
    }
);

// Fetch a list of all teachers (id, name, department)
export const fetchAllTeachersList = createAsyncThunk<
    TeacherInfo[],
    void,
    { state: RootState; rejectValue: string }
>(
    'sharedData/fetchAllTeachersList',
    async (_, { getState, rejectWithValue }) => {
        const { allTeachers, isLoading } = getState().sharedData;
        if (allTeachers.length > 0 && !isLoading.teachers) {
            return allTeachers;
        }
        try {
            const teachers = await sharedDataApi.getAllTeachers();
            return teachers.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载教师列表');
        }
    }
);

// Fetch a lightweight list of all classrooms (id, building, roomNumber, capacity)
export const fetchAllClassroomsShortList = createAsyncThunk<
    Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[],
    void,
    { state: RootState; rejectValue: string }
>(
    'sharedData/fetchAllClassroomsShortList',
    async (_, { getState, rejectWithValue }) => {
        const { allClassroomsShort, isLoading } = getState().sharedData;
        if (allClassroomsShort.length > 0 && !isLoading.classrooms) {
            return allClassroomsShort;
        }
        try {
            const classrooms = await sharedDataApi.getAllClassroomsList();
            return classrooms.sort((a, b) => `${a.building} ${a.roomNumber}`.localeCompare(`${b.building} ${b.roomNumber}`));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载教室列表');
        }
    }
);

// --- Slice Definition ---
const sharedDataSlice = createSlice({
    name: 'sharedData',
    initialState,
    reducers: {
        // Action to clear shared data on logout or when explicitly needed
        clearSharedDataState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        // Helper to handle common error accumulation
        const appendError = (currentError: string | null, newError: string | undefined): string => {
            if (!newError) return currentError || ''; // Keep existing error if new one is undefined
            return (currentError ? currentError + '; ' : '') + newError;
        };

        // Fetch All Courses Short List
        builder.addCase(fetchAllCoursesShortList.pending, (state) => {
            state.isLoading.courses = true;
            // state.error = null; // Clear error specifically for this fetch or manage globally
        })
            .addCase(fetchAllCoursesShortList.fulfilled, (state, action) => {
                state.isLoading.courses = false;
                state.allCoursesShort = action.payload;
            })
            .addCase(fetchAllCoursesShortList.rejected, (state, action) => {
                state.isLoading.courses = false;
                state.error = appendError(state.error, `课程列表: ${action.payload}`);
            });

        // Fetch All Teachers List
        builder.addCase(fetchAllTeachersList.pending, (state) => {
            state.isLoading.teachers = true;
        })
            .addCase(fetchAllTeachersList.fulfilled, (state, action) => {
                state.isLoading.teachers = false;
                state.allTeachers = action.payload;
            })
            .addCase(fetchAllTeachersList.rejected, (state, action) => {
                state.isLoading.teachers = false;
                state.error = appendError(state.error, `教师列表: ${action.payload}`);
            });

        // Fetch All Classrooms Short List
        builder.addCase(fetchAllClassroomsShortList.pending, (state) => {
            state.isLoading.classrooms = true;
        })
            .addCase(fetchAllClassroomsShortList.fulfilled, (state, action) => {
                state.isLoading.classrooms = false;
                state.allClassroomsShort = action.payload;
            })
            .addCase(fetchAllClassroomsShortList.rejected, (state, action) => {
                state.isLoading.classrooms = false;
                state.error = appendError(state.error, `教室列表: ${action.payload}`);
            });
    },
});

// Export actions
export const { clearSharedDataState } = sharedDataSlice.actions;

// Export reducer
export default sharedDataSlice.reducer;