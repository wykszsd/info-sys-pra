// src/features/admin/courses/store/adminCourseSlice.ts
//@ts-nocheck
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Course, CoursePayload } from '../../../../types';
import { adminCourseApi } from '../services/adminCourseApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store';

// API 参数接口，与 adminCourseApi.getCourses 的期望匹配
interface GetCoursesApiParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filter?: { courseName_like?: string; courseCode_like?: string };
}

export interface AdminCourseState {
    courses: Course[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    page: number;
    pageSize: number;
    filterName: string; // 存储当前课程名/代码的搜索词
    currentSort?: string; // 存储当前排序字符串，例如 "courseCode,asc"
}

// Thunk 的参数，可以与 API 参数略有不同或是其子集
interface FetchAdminCoursesThunkParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filterNameQuery?: string;
    filter?: { courseName_like?: string; courseCode_like?: string };
}

const initialState: AdminCourseState = {
    courses: [], isLoading: false, error: null, totalCount: 0, page: 0, pageSize: 10, filterName: '', currentSort: undefined,
};

// 异步 Thunks
export const fetchAdminCourses = createAsyncThunk<
    { courses: Course[], totalCount: number }, FetchAdminCoursesThunkParams, { state: RootState, rejectValue: string }
>(
    'adminCourses/fetchAdminCourses',
    async (thunkParams, { getState, rejectWithValue }) => {
        const currentSliceState = getState().adminCourses;
        const apiParams: GetCoursesApiParams = {
            page: thunkParams.page !== undefined ? thunkParams.page : currentSliceState.page,
            pageSize: thunkParams.pageSize !== undefined ? thunkParams.pageSize : currentSliceState.pageSize,
            sort: thunkParams.sort ?? currentSliceState.currentSort,
        };
        const filterQuery = thunkParams.filterNameQuery ?? currentSliceState.filterName;
        if (filterQuery) {
            apiParams.filter = { ...apiParams.filter, courseName_like: filterQuery, courseCode_like: filterQuery };
        } else if (thunkParams.filter) {
            apiParams.filter = { ...apiParams.filter, ...thunkParams.filter };
        }

        try {
            const response = await adminCourseApi.getCourses(apiParams);
            return { courses: response.data, totalCount: response.totalCount };
        } catch (err: any) { // 仍然遵循你使用的 error: any
            let message: string;
            const error = err; // 为清晰起见，可以重新赋值，类型仍为 any

            const potentialApiMessage = error?.response?.data?.message;
            const potentialErrorMessage = error?.message;

            if (typeof potentialApiMessage === 'string' && potentialApiMessage.length > 0) {
                message = potentialApiMessage;
            } else if (typeof potentialErrorMessage === 'string' && potentialErrorMessage.length > 0) {
                message = potentialErrorMessage;
            } else {
                message = '加载课程列表失败';
            }
            return rejectWithValue(message);
        }
    }
);

export const createAdminCourse = createAsyncThunk<Course, CoursePayload, { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }>(
    'adminCourses/createAdminCourse',
    async (payload, { dispatch, getState, rejectWithValue }) => {
        try {
            const newCourse = await adminCourseApi.createCourse(payload);
            const { pageSize, filterName, currentSort } = getState().adminCourses;
            dispatch(fetchAdminCourses({
                page: 0,
                pageSize,
                sort: currentSort,
                filterNameQuery: filterName
            }));
            return newCourse;
        } catch (err: any) { // 此处为之前的第73行，现在的第82行附近
            let message: string;
            const error = err; // 类型为 any

            // 从 error 对象中安全地提取消息
            const potentialApiMessage = error?.response?.data?.message;
            const potentialErrorMessage = error?.message;

            // 明确检查提取的值是否为有效的字符串
            if (typeof potentialApiMessage === 'string' && potentialApiMessage.length > 0) {
                message = potentialApiMessage;
            } else if (typeof potentialErrorMessage === 'string' && potentialErrorMessage.length > 0) {
                message = potentialErrorMessage;
            } else {
                message = '创建课程失败'; // 默认错误消息
            }
            return rejectWithValue(message);
        }
    }
);

export const updateAdminCourse = createAsyncThunk<Course, { id: number; payload: Partial<CoursePayload> }, { rejectValue: string }>(
    'adminCourses/updateAdminCourse',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            return await adminCourseApi.updateCourse(id, payload);
        } catch (err: any) {
            let message: string;
            const error = err;

            const potentialApiMessage = error?.response?.data?.message;
            const potentialErrorMessage = error?.message;

            if (typeof potentialApiMessage === 'string' && potentialApiMessage.length > 0) {
                message = potentialApiMessage;
            } else if (typeof potentialErrorMessage === 'string' && potentialErrorMessage.length > 0) {
                message = potentialErrorMessage;
            } else {
                message = '更新课程失败';
            }
            return rejectWithValue(message);
        }
    }
);

export const deleteAdminCourse = createAsyncThunk<number, number, { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }>(
    'adminCourses/deleteAdminCourse',
    async (id, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminCourseApi.deleteCourse(id);
            const { page, pageSize, filterName, currentSort } = getState().adminCourses;
            dispatch(fetchAdminCourses({
                page,
                pageSize,
                sort: currentSort,
                filterNameQuery: filterName
            }));
            return id;
        } catch (err: any) {
            let message: string;
            const error = err;

            const potentialApiMessage = error?.response?.data?.message;
            const potentialErrorMessage = error?.message;

            if (typeof potentialApiMessage === 'string' && potentialApiMessage.length > 0) {
                message = potentialApiMessage;
            } else if (typeof potentialErrorMessage === 'string' && potentialErrorMessage.length > 0) {
                message = potentialErrorMessage;
            } else {
                message = '删除课程失败';
            }
            return rejectWithValue(message);
        }
    }
);

const adminCourseSlice = createSlice({
    name: 'adminCourses',
    initialState,
    reducers: {
        setAdminCoursePage: (state, action: PayloadAction<number>) => { state.page = action.payload; },
        setAdminCoursePageSize: (state, action: PayloadAction<number>) => { state.pageSize = action.payload; state.page = 0; },
        setAdminCourseFilterName: (state, action: PayloadAction<string>) => {
            state.filterName = action.payload; state.page = 0;
        },
        setAdminCourseSort: (state, action: PayloadAction<string | undefined>) => {
            state.currentSort = action.payload; state.page = 0;
        },
        clearAdminCourseState: (state) => { Object.assign(state, initialState); }
    },
    extraReducers: (builder) => {
        const genericPendingHandler = (state: AdminCourseState) => { state.isLoading = true; state.error = null; };
        const genericRejectedHandler = (state: AdminCourseState, action: PayloadAction<string | undefined>) => {
            state.isLoading = false;
            state.error = action.payload ?? "发生未知错误";
        };

        builder
            .addCase(fetchAdminCourses.pending, genericPendingHandler)
            .addCase(fetchAdminCourses.fulfilled, (state, action) => {
                state.isLoading = false;
                state.courses = action.payload.courses;
                state.totalCount = action.payload.totalCount;
                if (action.meta.arg.page !== undefined) state.page = action.meta.arg.page;
                if (action.meta.arg.pageSize !== undefined) state.pageSize = action.meta.arg.pageSize;
                if (action.meta.arg.filterNameQuery !== undefined) {
                    state.filterName = action.meta.arg.filterNameQuery;
                }
                if (action.meta.arg.sort !== undefined) {
                    state.currentSort = action.meta.arg.sort;
                }
            })
            .addCase(fetchAdminCourses.rejected, genericRejectedHandler)
            .addCase(createAdminCourse.pending, genericPendingHandler)
            .addCase(createAdminCourse.fulfilled, (state) => { state.isLoading = false; })
            .addCase(createAdminCourse.rejected, genericRejectedHandler)
            .addCase(updateAdminCourse.pending, genericPendingHandler)
            .addCase(updateAdminCourse.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.courses.findIndex(c => c.courseId === action.payload.courseId);
                if (index !== -1) state.courses[index] = action.payload;
            })
            .addCase(updateAdminCourse.rejected, genericRejectedHandler)
            .addCase(deleteAdminCourse.pending, genericPendingHandler)
            .addCase(deleteAdminCourse.fulfilled, (state) => { state.isLoading = false; })
            .addCase(deleteAdminCourse.rejected, genericRejectedHandler);
    },
});

export const {
    setAdminCoursePage, setAdminCoursePageSize, setAdminCourseFilterName,
    setAdminCourseSort, clearAdminCourseState,
} = adminCourseSlice.actions;
export default adminCourseSlice.reducer;