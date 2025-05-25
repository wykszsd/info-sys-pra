// src/features/exams/store/examSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { ExamState, ExamArrangement } from '../../../types';
import { examApi } from '../services/examApi';

const initialState: ExamState = {
    myExams: [],
    isLoading: false,
    error: null, // Initialized
    currentSemesterId: null,
    hasLoadedMyExams: false, // <-- Add this
};

export const fetchStudentExams = createAsyncThunk<ExamArrangement[], number, { rejectValue: string }>(
    'exams/fetchStudentExams',
    async (semesterId, { rejectWithValue }) => {
        if (!semesterId) return rejectWithValue("学期ID无效");
        try {
            const exams = await examApi.getMyExamArrangements(semesterId);
            return exams.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载考试安排');
        }
    }
);

const examSlice = createSlice({
    name: 'exams',
    initialState,
    reducers: {
        setCurrentExamSemesterId: (state, action: PayloadAction<number | null>) => {
            if (state.currentSemesterId !== action.payload) {
                state.currentSemesterId = action.payload;
                state.myExams = [];
                state.hasLoadedMyExams = false; // Reset loaded flag
                state.error = null;
            }
        },
        clearExamState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStudentExams.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                // state.hasLoadedMyExams = false; // Optional reset
            })
            .addCase(fetchStudentExams.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myExams = action.payload;
                state.hasLoadedMyExams = true;
            })
            .addCase(fetchStudentExams.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? '获取考试安排未知错误';
                state.hasLoadedMyExams = true; // Mark as attempted
            });
    },
});

export const { setCurrentExamSemesterId, clearExamState } = examSlice.actions;
export default examSlice.reducer;