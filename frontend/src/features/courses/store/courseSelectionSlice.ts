// src/features/courses/store/courseSelectionSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { CourseSelectionState, SelectableCourse, EnrollmentRecord } from '../../../types';
import { courseApi } from '../services/courseApi';
import type { AppDispatch, RootState } from '../../../store';

const initialState: CourseSelectionState = {
    selectableCourses: [],
    myEnrollments: [],
    isLoading: false,
    isEnrolling: new Set<number>(),
    error: null,
    currentSemesterId: null,
    hasLoadedSelectableCourses: false, // 初始化
    hasLoadedEnrollments: false,       // 初始化
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
                // After enrolling, re-fetch both to update counts and enrollment status
                dispatch(fetchStudentEnrollments(semesterId)); // This will update myEnrollments
                dispatch(fetchAllSelectableCourses(semesterId)); // This will update selectableCourses (e.g., enrolledCount)
            }
            return { message: '选课成功！' };
        } catch (error: any) { return rejectWithValue(error.response?.data?.message || error.message || '选课操作失败'); }
    }
);

export const withdrawStudentFromCourse = createAsyncThunk<EnrollWithdrawResult, { enrollmentId: number, scheduleId: number }, { dispatch: AppDispatch, state: RootState, rejectValue: string }>(
    'courses/withdrawStudentFromCourse',
    async ({ enrollmentId, scheduleId }, { dispatch, getState, rejectWithValue }) => {
        try {
            await courseApi.withdrawFromCourse(enrollmentId, scheduleId); // Pass scheduleId for mock
            const semesterId = getState().courses.currentSemesterId;
            if (semesterId) {
                // After withdrawing, re-fetch both
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
                state.selectableCourses = [];
                state.myEnrollments = [];
                state.error = null;
                state.hasLoadedSelectableCourses = false; // 重置
                state.hasLoadedEnrollments = false;       // 重置
            }
        },
        clearCourseSelectionError: (state) => { state.error = null; },
        clearCourseSelectionState: (state) => {
            Object.assign(state, initialState, { isEnrolling: new Set() }); // 确保 isEnrolling 也正确重置
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllSelectableCourses.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAllSelectableCourses.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectableCourses = action.payload;
                state.hasLoadedSelectableCourses = true; // 设置
            })
            .addCase(fetchAllSelectableCourses.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? '获取可选课程未知错误';
                state.hasLoadedSelectableCourses = true; // 标记为已尝试加载
            })

            .addCase(fetchStudentEnrollments.pending, (state) => { state.isLoading = true; /* No error clear here to preserve selectableCourses error if any */ })
            .addCase(fetchStudentEnrollments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myEnrollments = action.payload;
                state.hasLoadedEnrollments = true; // 设置
            })
            .addCase(fetchStudentEnrollments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = (state.error ? state.error + '; ' : '') + (action.payload ?? '获取已选课程未知错误');
                state.hasLoadedEnrollments = true; // 标记为已尝试加载
            })

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