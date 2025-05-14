//@ts-nocheck
// src/features/admin/requests/store/adminRequestSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { TeacherRequest, RequestType } from '../../../../types';
import { adminRequestApi } from '../services/adminRequestApi';
import type { RootState, AppDispatch as GlobalAppDispatch } from '../../../../store';

// 辅助函数，用于从未知错误中提取消息字符串
function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (typeof error === 'string') {
        return error;
    }
    // 检查是否是类似 Axios 的错误对象或其他带有 message 属性的对象
    // 注意：如果你知道确切的错误结构（例如，使用了特定的 HTTP 客户端库），
    // 你可以编写更精确的类型守卫。
    if (error && typeof error === 'object') {
        const errAsAny = error as any; // 在检查后，可以临时用 any 来访问属性

        // 尝试获取 error.response.data.message
        if (
            errAsAny.response &&
            typeof errAsAny.response === 'object' &&
            errAsAny.response.data &&
            typeof errAsAny.response.data === 'object' &&
            typeof errAsAny.response.data.message === 'string'
        ) {
            return errAsAny.response.data.message;
        }
        // 尝试获取 error.message
        if (typeof errAsAny.message === 'string') {
            return errAsAny.message;
        }
    }
    return defaultMessage;
}


export interface AdminRequestState {
    pendingRequests: TeacherRequest[];
    isLoading: boolean;
    isProcessing: Set<number>;
    error: string | null; // 保持 string | null
    filterType: 'all' | RequestType;
}

interface FetchPendingRequestsParams {
    filterType?: AdminRequestState['filterType'];
}

const initialState: AdminRequestState = {
    pendingRequests: [],
    isLoading: false,
    isProcessing: new Set(),
    error: null,
    filterType: 'all',
};

export const fetchPendingAdminRequests = createAsyncThunk<
    TeacherRequest[],
    FetchPendingRequestsParams | void,
    { state: RootState, rejectValue: string }
>(
    'adminRequests/fetchPendingAdminRequests',
    async (params, { getState, rejectWithValue }) => {
        const currentFilter = params?.filterType ?? getState().adminRequests.filterType;
        try {
            const requests = await adminRequestApi.getPendingRequests(currentFilter);
            return requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        } catch (error: unknown) { // <-- 使用 unknown
            return rejectWithValue(getErrorMessage(error, '加载待审批请求失败'));
        }
    }
);

export const approveAdminRequestAction = createAsyncThunk<
    number,
    number,
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminRequests/approveAdminRequest',
    async (requestId, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminRequestApi.approveRequest(requestId);
            const currentFilter = getState().adminRequests.filterType;
            dispatch(fetchPendingAdminRequests({ filterType: currentFilter }));
            return requestId;
        } catch (error: unknown) { // <-- 使用 unknown
            return rejectWithValue(getErrorMessage(error, '批准请求失败'));
        }
    }
);

export const rejectAdminRequestAction = createAsyncThunk<
    number,
    { requestId: number; reason: string },
    { dispatch: GlobalAppDispatch, getState: () => RootState, rejectValue: string }
>(
    'adminRequests/rejectAdminRequest',
    async ({ requestId, reason }, { dispatch, getState, rejectWithValue }) => {
        try {
            await adminRequestApi.rejectRequest(requestId, reason);
            const currentFilter = getState().adminRequests.filterType;
            dispatch(fetchPendingAdminRequests({ filterType: currentFilter }));
            return requestId;
        } catch (error: unknown) { // <-- 使用 unknown
            return rejectWithValue(getErrorMessage(error, '拒绝请求失败'));
        }
    }
);

const adminRequestSlice = createSlice({
    name: 'adminRequests',
    initialState,
    reducers: {
        setAdminRequestFilterType: (state, action: PayloadAction<AdminRequestState['filterType']>) => {
            state.filterType = action.payload;
            state.error = null;
        },
        clearAdminRequestState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPendingAdminRequests.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPendingAdminRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingRequests = action.payload;
                if (action.meta.arg?.filterType) {
                    state.filterType = action.meta.arg.filterType;
                }
            })
            .addCase(fetchPendingAdminRequests.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null; // <-- 修复
            })

            .addCase(approveAdminRequestAction.pending, (state, action) => {
                state.isProcessing.add(action.meta.arg);
                state.error = null;
            })
            .addCase(approveAdminRequestAction.fulfilled, (state, action) => {
                state.isProcessing.delete(action.payload);
            })
            .addCase(approveAdminRequestAction.rejected, (state, action) => {
                state.isProcessing.delete(action.meta.arg);
                state.error = action.payload ?? null; // <-- 修复
            })

            .addCase(rejectAdminRequestAction.pending, (state, action) => {
                state.isProcessing.add(action.meta.arg.requestId);
                state.error = null;
            })
            .addCase(rejectAdminRequestAction.fulfilled, (state, action) => {
                state.isProcessing.delete(action.payload);
            })
            .addCase(rejectAdminRequestAction.rejected, (state, action) => {
                state.isProcessing.delete(action.meta.arg.requestId);
                state.error = action.payload ?? null; // <-- 修复
            });
    },
});

export const { setAdminRequestFilterType, clearAdminRequestState } = adminRequestSlice.actions;
export default adminRequestSlice.reducer;