// src/features/assignments/store/assignmentSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AssignmentState, AssignmentPayload, Course } from '../../../types'; // Adjust path
// Adjust path
import { assignmentApi } from '../services/assignmentApi'; // Adjust path
// Adjust path

const initialState: AssignmentState = {
    isSubmitting: false,
    submitSuccess: false,
    error: null,
    teacherCourses: [], // Courses taught by the teacher for the dropdown
    isLoadingCourses: false,
    currentSemesterIdForCourses: null, // To fetch courses for the correct semester
    hasLoadedTeacherCourses: false, // <-- Add this
};

// Thunks
export const fetchTeacherCoursesForAssignments = createAsyncThunk<Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[], number, { rejectValue: string }>(
    'assignments/fetchTeacherCourses',
    async (semesterId, { rejectWithValue }) => {
        if (!semesterId) return rejectWithValue("学期ID无效");
        try {
            // This API needs to return a list of courses the teacher teaches in the semester
            const courses = await assignmentApi.getCoursesTaughtByTeacher(semesterId);
            return courses.sort((a, b) => a.courseName.localeCompare(b.courseName));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载您的授课列表');
        }
    }
);

export const postAssignmentNotification = createAsyncThunk<{ message: string }, AssignmentPayload, { rejectValue: string }>(
    'assignments/postNotification', // Renamed for clarity
    async (payload, { rejectWithValue }) => {
        if (!payload.title || !payload.content || !payload.courseId) { // Assuming courseId is mandatory for now
            return rejectWithValue("请填写标题、内容并选择目标课程。");
        }
        try {
            const response = await assignmentApi.submitAssignment(payload);
            return response; // Expects { message: string } or similar from API
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '发布作业通知失败');
        }
    }
);

const assignmentSlice = createSlice({
    name: 'assignments',
    initialState,
    reducers: {
        setAssignmentSemesterId: (state, action: PayloadAction<number | null>) => {
            if (state.currentSemesterIdForCourses !== action.payload) {
                state.currentSemesterIdForCourses = action.payload;
                state.teacherCourses = [];
                state.hasLoadedTeacherCourses = false; // Reset loaded flag
                state.error = null;
            }
        },
        resetAssignmentFormStatus: (state) => { // Renamed for clarity
            state.isSubmitting = false;
            state.submitSuccess = false;
            state.error = null;
        },
        clearAssignmentState: (state) => { // For logout
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Teacher Courses
            .addCase(fetchTeacherCoursesForAssignments.pending, (state) => {
                state.isLoadingCourses = true;
                state.error = null;
                // state.hasLoadedTeacherCourses = false; // Optional reset
            })
            .addCase(fetchTeacherCoursesForAssignments.fulfilled, (state, action) => {
                state.isLoadingCourses = false;
                state.teacherCourses = action.payload;
                state.hasLoadedTeacherCourses = true;
            })
            .addCase(fetchTeacherCoursesForAssignments.rejected, (state, action) => {
                state.isLoadingCourses = false;
                state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误');
                state.hasLoadedTeacherCourses = true; // Mark as attempted
            })
            // Submit Assignment Notification
            .addCase(postAssignmentNotification.pending, (state) => { state.isSubmitting = true; state.submitSuccess = false; state.error = null; })
            .addCase(postAssignmentNotification.fulfilled, (state) => { state.isSubmitting = false; state.submitSuccess = true; })
            .addCase(postAssignmentNotification.rejected, (state, action) => { state.isSubmitting = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误'); });
    },
});

export const { setAssignmentSemesterId, resetAssignmentFormStatus, clearAssignmentState } = assignmentSlice.actions;
export default assignmentSlice.reducer;