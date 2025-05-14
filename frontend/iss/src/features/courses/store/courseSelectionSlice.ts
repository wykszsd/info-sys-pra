// src/features/courses/store/courseSelectionSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { CourseSelectionState, SelectableCourse, EnrollmentRecord } from '../../../types';
import { courseApi } from '../services/courseApi';
import type { AppDispatch, RootState } from '../../../store'; // Ensure AppDispatch is imported
// Ensure AppDispatch is imported

const initialState: CourseSelectionState = {
    selectableCourses: [],
    myEnrollments: [],
    isLoading: false,
    isEnrolling: new Set<number>(),
    error: null, // Initialized
    currentSemesterId: null,
};

interface EnrollWithdrawResult { message: string; }

export const fetchAllSelectableCourses = createAsyncThunk<SelectableCourse[], number, { rejectValue: string }>(
    'courses/fetchAllSelectable',
    async (semesterId, { rejectWithValue }) => {
        if (!semesterId) return rejectWithValue("学期ID无效");
        try { return await courseApi.getSelectableCourses(semesterId); }
        catch (error: any) { return rejectWithValue(error.response?.data?.message || error.message || '无法加载可选课程'); }
    }
);

export const fetchStudentEnrollments = createAsyncThunk<EnrollmentRecord[], number, { rejectValue: string }>(
    'courses/fetchStudentEnrollments',
    async (semesterId, { rejectWithValue }) => {
        if (!semesterId) return rejectWithValue("学期ID无效");
        try { return await courseApi.getMyEnrollments(semesterId); }
        catch (error: any) { return rejectWithValue(error.response?.data?.message || error.message || '无法加载已选课程'); }
    }
);

export const enrollStudentInCourse = createAsyncThunk<EnrollWithdrawResult, number, { dispatch: AppDispatch, state: RootState, rejectValue: string }>(
    'courses/enrollStudentInCourse',
    async (scheduleId, { dispatch, getState, rejectWithValue }) => {
        try {
            await courseApi.enrollInCourse(scheduleId);
            const semesterId = getState().courses.currentSemesterId;
            if (semesterId) {
                dispatch(fetchStudentEnrollments(semesterId));
                dispatch(fetchAllSelectableCourses(semesterId));
            }
            return { message: '选课成功！' };
        } catch (error: any) { return rejectWithValue(error.response?.data?.message || error.message || '选课操作失败'); }
    }
);

export const withdrawStudentFromCourse = createAsyncThunk<EnrollWithdrawResult, { enrollmentId: number, scheduleId: number }, { dispatch: AppDispatch, state: RootState, rejectValue: string }>(
    'courses/withdrawStudentFromCourse',
    async ({ enrollmentId, scheduleId }, { dispatch, getState, rejectWithValue }) => {
        try {
            await courseApi.withdrawFromCourse(enrollmentId, scheduleId);
            const semesterId = getState().courses.currentSemesterId;
            if (semesterId) {
                dispatch(fetchStudentEnrollments(semesterId));
                dispatch(fetchAllSelectableCourses(semesterId));
            }
            return { message: '退课成功！' };
        } catch (error: any) { return rejectWithValue(error.response?.data?.message || error.message || '退课操作失败'); }
    }
);

const courseSelectionSlice = createSlice({
    name: 'courses',
    initialState,
    reducers: {
        setCurrentCourseSemesterId: (state, action: PayloadAction<number | null>) => {
            if (state.currentSemesterId !== action.payload) {
                state.currentSemesterId = action.payload;
                state.selectableCourses = []; state.myEnrollments = []; state.error = null;
            }
        },
        clearCourseSelectionError: (state) => { state.error = null; },
        clearCourseSelectionState: (state) => { Object.assign(state, initialState); }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllSelectableCourses.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAllSelectableCourses.fulfilled, (state, action) => { state.isLoading = false; state.selectableCourses = action.payload; })
            .addCase(fetchAllSelectableCourses.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? '获取可选课程未知错误'; })

            .addCase(fetchStudentEnrollments.pending, (state) => { state.isLoading = true; /* No error clear here */ })
            .addCase(fetchStudentEnrollments.fulfilled, (state, action) => { state.isLoading = false; state.myEnrollments = action.payload; })
            .addCase(fetchStudentEnrollments.rejected, (state, action) => { state.isLoading = false; state.error = (state.error ? state.error + '; ' : '') + (action.payload ?? '获取已选课程未知错误'); })

            .addCase(enrollStudentInCourse.pending, (state, action) => { state.isEnrolling.add(action.meta.arg); state.error = null; })
            .addCase(enrollStudentInCourse.fulfilled, (state, action) => { state.isEnrolling.delete(action.meta.arg); })
            .addCase(enrollStudentInCourse.rejected, (state, action) => { state.isEnrolling.delete(action.meta.arg); state.error = action.payload ?? '选课未知错误'; })

            .addCase(withdrawStudentFromCourse.pending, (state, action) => { state.isEnrolling.add(action.meta.arg.scheduleId); state.error = null; })
            .addCase(withdrawStudentFromCourse.fulfilled, (state, action) => { state.isEnrolling.delete(action.meta.arg.scheduleId); })
            .addCase(withdrawStudentFromCourse.rejected, (state, action) => { state.isEnrolling.delete(action.meta.arg.scheduleId); state.error = action.payload ?? '退课未知错误'; });
    },
});

export const { setCurrentCourseSemesterId, clearCourseSelectionError, clearCourseSelectionState } = courseSelectionSlice.actions;
export default courseSelectionSlice.reducer;