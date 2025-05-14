// src/features/requests/store/requestSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestState, Schedule, ScheduleChangeRequestPayload, ExamRequestPayload, TeacherRequest } from '../../../types'; // Adjust path
// Adjust path
import { requestApi } from '../services/requestApi'; // Adjust path
// Adjust path
// For fetching teacher schedules, we might reuse timetableApi or have a specific one in requestApi
// import { timetableApi } from '../../timetable/services/timetableApi'; // Example reuse

const initialState: RequestState = {
    teacherSchedules: [], // For selecting original schedule in forms
    isLoadingSchedules: false,
    isSubmittingChange: false, // For schedule change requests
    isSubmittingExam: false,   // For exam arrangement requests
    submitSuccess: false,      // Generic success flag after any submission
    myRequests: [],            // List of teacher's submitted requests (both types)
    isLoadingMyRequests: false,
    error: null,
    currentSemesterIdForSchedules: null, // Track for which semester schedules are loaded
};

// Thunks
export const fetchTeacherSchedulesForRequests = createAsyncThunk<Schedule[], number, { rejectValue: string }>(
    'requests/fetchTeacherSchedules',
    async (semesterId, { rejectWithValue }) => {
        if (!semesterId) return rejectWithValue("学期ID无效");
        try {
            // TODO (Backend): API GET /api/timetable/my?semesterId={semesterId}&view=allForTeacher
            // This API needs to return ALL schedules for the logged-in teacher in that semester,
            // not just for a specific week.
            // For mock, timetableApi.getMyTimetable might need adjustment or use a dedicated mock.
            const schedules = await requestApi.getMySchedulesForSemester(semesterId);
            return schedules.sort((a, b) => (a.courseName || "").localeCompare(b.courseName || "")); // Sort for dropdown
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载您的课程安排');
        }
    }
);

export const submitScheduleChangeApp = createAsyncThunk<TeacherRequest, ScheduleChangeRequestPayload, { rejectValue: string }>(
    'requests/submitScheduleChange', // Renamed for clarity
    async (payload, { rejectWithValue }) => {
        try {
            const newRequest = await requestApi.submitScheduleChange(payload);
            return newRequest; // Backend should return the created request object
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '提交调课申请失败');
        }
    }
);

export const submitExamArrangementApp = createAsyncThunk<TeacherRequest, ExamRequestPayload, { rejectValue: string }>(
    'requests/submitExamArrangement', // Renamed for clarity
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
    'requests/fetchTeacherRequests', // Renamed for clarity
    async (_, { rejectWithValue }) => {
        try {
            const requests = await requestApi.getMyRequests(); // API should return all types of requests
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
                state.error = null;
            }
        },
        resetRequestSubmitStatus: (state) => {
            state.isSubmittingChange = false;
            state.isSubmittingExam = false;
            state.submitSuccess = false;
            state.error = null; // Clear error when resetting form/page
        },
        clearRequestState: (state) => { // For logout
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        // Fetch Teacher Schedules
        builder.addCase(fetchTeacherSchedulesForRequests.pending, (state) => { state.isLoadingSchedules = true; state.error = null; })
            .addCase(fetchTeacherSchedulesForRequests.fulfilled, (state, action) => { state.isLoadingSchedules = false; state.teacherSchedules = action.payload; })
            .addCase(fetchTeacherSchedulesForRequests.rejected, (state, action) => { state.isLoadingSchedules = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误'); });
        // Submit Schedule Change
        builder.addCase(submitScheduleChangeApp.pending, (state) => { state.isSubmittingChange = true; state.submitSuccess = false; state.error = null; })
            .addCase(submitScheduleChangeApp.fulfilled, (state, action) => { state.isSubmittingChange = false; state.submitSuccess = true; state.myRequests.unshift(action.payload); /* Add to list optimistically or refetch */ })
            .addCase(submitScheduleChangeApp.rejected, (state, action) => { state.isSubmittingChange = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误'); });
        // Submit Exam Arrangement
        builder.addCase(submitExamArrangementApp.pending, (state) => { state.isSubmittingExam = true; state.submitSuccess = false; state.error = null; })
            .addCase(submitExamArrangementApp.fulfilled, (state, action) => { state.isSubmittingExam = false; state.submitSuccess = true; state.myRequests.unshift(action.payload); })
            .addCase(submitExamArrangementApp.rejected, (state, action) => { state.isSubmittingExam = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误'); });
        // Fetch My Requests
        builder.addCase(fetchTeacherRequests.pending, (state) => { state.isLoadingMyRequests = true; state.error = null; })
            .addCase(fetchTeacherRequests.fulfilled, (state, action) => { state.isLoadingMyRequests = false; state.myRequests = action.payload; })
            .addCase(fetchTeacherRequests.rejected, (state, action) => { state.isLoadingMyRequests = false; state.error = typeof action.payload === 'string' ? action.payload : (action.error?.message || '未知错误'); });
    },
});

export const { setRequestSemesterId, resetRequestSubmitStatus, clearRequestState } = requestSlice.actions;
export default requestSlice.reducer;