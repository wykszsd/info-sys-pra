// src/features/requests/store/requestSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestState, Schedule, ScheduleChangeRequestPayload, ExamRequestPayload, TeacherRequest } from '../../../types';
import { requestApi } from '../services/requestApi';

const initialState: RequestState = {
    teacherSchedules: [],
    isLoadingSchedules: false,
    isSubmittingChange: false,
    isSubmittingExam: false,
    submitSuccess: false,
    myRequests: [],
    isLoadingMyRequests: false,
    error: null,
    currentSemesterIdForSchedules: null,
    hasLoadedTeacherSchedules: false,
    hasLoadedMyRequests: false,
};

export const fetchTeacherSchedulesForRequests = createAsyncThunk<Schedule[], number, { rejectValue: string }>(
    'requests/fetchTeacherSchedules',
    async (semesterId, { rejectWithValue }) => {
        console.log(`[requestSlice] Thunk fetchTeacherSchedulesForRequests called with semesterId: ${semesterId}`);
        if (!semesterId) {
            console.error('[requestSlice] Invalid semesterId provided to fetchTeacherSchedulesForRequests.');
            return rejectWithValue("学期ID无效");
        }
        try {
            const schedules = await requestApi.getMySchedulesForSemester(semesterId);
            console.log('[requestSlice] API getMySchedulesForSemester response:', schedules); // Log API response

            // Validate response structure (basic check)
            if (!Array.isArray(schedules)) {
                console.error('[requestSlice] API response for teacher schedules is not an array:', schedules);
                return rejectWithValue('获取的课程安排数据格式不正确 (非数组)');
            }
            // Optional: Further validation of individual schedule items if necessary
            // schedules.forEach((item, index) => {
            //   if (typeof item.scheduleId !== 'number' || typeof item.courseName !== 'string') {
            //     console.warn(`[requestSlice] Schedule item at index ${index} has missing/invalid fields:`, item);
            //   }
            // });

            return schedules.sort((a, b) => (a.courseName || "").localeCompare(b.courseName || ""));
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || '无法加载您的课程安排';
            console.error('[requestSlice] Error fetching teacher schedules:', errorMessage, error);
            return rejectWithValue(errorMessage);
        }
    }
);

export const submitScheduleChangeApp = createAsyncThunk<TeacherRequest, ScheduleChangeRequestPayload, { rejectValue: string }>(
    'requests/submitScheduleChange',
    async (payload, { rejectWithValue }) => {
        try {
            const newRequest = await requestApi.submitScheduleChange(payload);
            return newRequest;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '提交调课申请失败');
        }
    }
);

export const submitExamArrangementApp = createAsyncThunk<TeacherRequest, ExamRequestPayload, { rejectValue: string }>(
    'requests/submitExamArrangement',
    async (payload, { rejectWithValue }) => {
        try {
            const newRequest = await requestApi.submitExamRequest(payload);
            return newRequest;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '提交考试安排申请失败');
        }
    }
);

export const fetchTeacherRequests = createAsyncThunk<TeacherRequest[], void, { rejectValue: string }>(
    'requests/fetchTeacherRequests',
    async (_, { rejectWithValue }) => {
        try {
            const requests = await requestApi.getMyRequests();
            return requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载我的申请记录');
        }
    }
);

const requestSlice = createSlice({
    name: 'requests',
    initialState,
    reducers: {
        setRequestSemesterId: (state, action: PayloadAction<number | null>) => {
            if (state.currentSemesterIdForSchedules !== action.payload) {
                state.currentSemesterIdForSchedules = action.payload;
                state.teacherSchedules = []; // Clear when semester changes
                state.hasLoadedTeacherSchedules = false; // Reset load flag
                state.error = null;
            }
        },
        resetRequestSubmitStatus: (state) => {
            state.isSubmittingChange = false;
            state.isSubmittingExam = false;
            state.submitSuccess = false;
            state.error = null;
        },
        clearRequestState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        // Fetch Teacher Schedules
        builder.addCase(fetchTeacherSchedulesForRequests.pending, (state) => {
            state.isLoadingSchedules = true;
            state.error = null; // Clear previous errors specifically for this fetch
        })
            .addCase(fetchTeacherSchedulesForRequests.fulfilled, (state, action) => {
                state.isLoadingSchedules = false;
                state.teacherSchedules = action.payload;
                state.hasLoadedTeacherSchedules = true; // Mark as loaded
                state.error = null; // Clear error on success
            })
            .addCase(fetchTeacherSchedulesForRequests.rejected, (state, action) => {
                state.isLoadingSchedules = false;
                state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '加载教师课程安排时发生未知错误');
                state.teacherSchedules = []; // Clear schedules on error
                state.hasLoadedTeacherSchedules = false; // Reset load flag
            });
        // Submit Schedule Change
        builder.addCase(submitScheduleChangeApp.pending, (state) => { state.isSubmittingChange = true; state.submitSuccess = false; state.error = null; })
            .addCase(submitScheduleChangeApp.fulfilled, (state, action) => { state.isSubmittingChange = false; state.submitSuccess = true; state.myRequests.unshift(action.payload); })
            .addCase(submitScheduleChangeApp.rejected, (state, action) => { state.isSubmittingChange = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '提交调课申请未知错误'); });
        // Submit Exam Arrangement
        builder.addCase(submitExamArrangementApp.pending, (state) => { state.isSubmittingExam = true; state.submitSuccess = false; state.error = null; })
            .addCase(submitExamArrangementApp.fulfilled, (state, action) => { state.isSubmittingExam = false; state.submitSuccess = true; state.myRequests.unshift(action.payload); })
            .addCase(submitExamArrangementApp.rejected, (state, action) => { state.isSubmittingExam = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '提交考试安排未知错误'); });
        // Fetch My Requests
        builder.addCase(fetchTeacherRequests.pending, (state) => { state.isLoadingMyRequests = true; state.error = null; })
            .addCase(fetchTeacherRequests.fulfilled, (state, action) => { state.isLoadingMyRequests = false; state.myRequests = action.payload; state.hasLoadedMyRequests = true; })
            .addCase(fetchTeacherRequests.rejected, (state, action) => { state.isLoadingMyRequests = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '加载我的申请未知错误'); state.hasLoadedMyRequests = false; });
    },
});

export const { setRequestSemesterId, resetRequestSubmitStatus, clearRequestState } = requestSlice.actions;
export default requestSlice.reducer;