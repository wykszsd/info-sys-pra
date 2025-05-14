// src/features/notifications/store/notificationSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { NotificationState, Notification } from '../../../types';
import { notificationApi } from '../services/notificationApi';
import type { AppDispatch } from '../../../store'; // Ensure AppDispatch is imported
// Ensure AppDispatch is imported

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null, // Initialized
    filter: 'all',
};

export const fetchUserNotifications = createAsyncThunk<Notification[], { filter: 'all' | 'unread' }, { rejectValue: string }>(
    'notifications/fetchUserNotifications',
    async ({ filter }, { rejectWithValue }) => {
        try {
            const params = filter === 'unread' ? { unread: true } : {};
            // The mock getMyNotifications now returns new objects, so Redux gets fresh data
            const notifications = await notificationApi.getMyNotifications(params);
            // Sorting is already handled in the mock, but can be here for real API too
            return notifications; // Assuming API returns them sorted or sorting is done in API/mock
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法加载通知列表');
        }
    }
);

export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>(
    'notifications/fetchInitialUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const notifications = await notificationApi.getMyNotifications({ unread: true });
            return notifications.length;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '无法获取未读通知数量');
        }
    }
);

export const markOneNotificationAsRead = createAsyncThunk<number, number, { rejectValue: string }>(
    'notifications/markOneAsRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            await notificationApi.markAsRead(notificationId); // Mock API now updates its internal state immutably
            return notificationId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '标记已读失败');
        }
    }
);

export const markAllUserNotificationsAsRead = createAsyncThunk<void, void, { dispatch: AppDispatch, rejectValue: string }>(
    'notifications/markAllAsRead',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            await notificationApi.markAllAsRead(); // Mock API now updates its internal state immutably
            // Re-fetch to get the updated list and count based on the current filter
            // This is a common pattern. The fulfilled reducer for markAll can also optimistically update.
            // For simplicity and consistency with how markAsRead is handled (returning ID, then reducer updates),
            // re-fetching after markAll is also a valid approach.
            // The `fetchUserNotifications` will get fresh data from the mock API.
            // The `fetchUnreadCount` will also get fresh data.
            dispatch(fetchUserNotifications({ filter: initialState.filter })); // Or use current state.filter
            dispatch(fetchUnreadCount());
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || '全部标记已读失败');
        }
    }
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotificationsFilter: (state, action: PayloadAction<'all' | 'unread'>) => {
            if (state.filter !== action.payload) {
                state.filter = action.payload;
            }
        },
        clearNotificationsState: (state) => {
            Object.assign(state, initialState);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserNotifications.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchUserNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notifications = action.payload; // payload is now an array of new objects
                // Recalculate unread count based on the fetched notifications
                // This is more robust than relying on filter, especially if fetch is called for 'all'
                state.unreadCount = action.payload.filter(n => !n.isRead).length;
            })
            .addCase(fetchUserNotifications.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? '获取通知未知错误'; })

            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            })
            .addCase(fetchUnreadCount.rejected, (_state, action) => {
                console.warn("Failed to fetch initial unread count:", action.payload);
            })

            .addCase(markOneNotificationAsRead.fulfilled, (state, action) => {
                const notificationId = action.payload;
                const index = state.notifications.findIndex(n => n.notificationId === notificationId);
                if (index !== -1 && !state.notifications[index].isRead) { // Ensure not already read
                    state.notifications[index].isRead = true; // Immer handles this fine
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                // If current filter is 'unread', remove the item from the list
                // This check should be done AFTER updating isRead and unreadCount
                if (state.filter === 'unread' && index !== -1 && state.notifications[index]?.isRead) {
                    state.notifications.splice(index, 1); // Immer handles this splice immutably
                }
            })
            .addCase(markOneNotificationAsRead.rejected, (state, action) => {
                console.error("Mark as read failed:", action.payload);
                state.error = `标记通知 #${action.meta.arg} 已读失败: ${action.payload ?? '未知错误'}`;
            })

            // For markAllUserNotificationsAsRead, the list and count are updated by subsequent fetches.
            // We can still handle pending/rejected for loading states and errors.
            .addCase(markAllUserNotificationsAsRead.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(markAllUserNotificationsAsRead.rejected, (state, action) => { state.isLoading = false; state.error = action.payload ?? '标记全部已读未知错误'; })
            .addCase(markAllUserNotificationsAsRead.fulfilled, (state) => {
                // isLoading should be set to false here, as the async thunk is fulfilled.
                // The actual data update (notifications list and unreadCount) will be handled
                // by the fetchUserNotifications and fetchUnreadCount thunks dispatched within markAllAsRead.
                // If you wanted an optimistic update before re-fetch, you'd do it here:
                // state.notifications.forEach(n => n.isRead = true);
                // state.unreadCount = 0;
                // if (state.filter === 'unread') state.notifications = [];
                // However, since we dispatch fetches, this reducer can just manage loading/error for the markAll action itself.
                state.isLoading = false; // Set to false as the markAll operation is complete.
                // Subsequent fetches will manage their own isLoading states.
            });
    },
});

export const { setNotificationsFilter, clearNotificationsState } = notificationSlice.actions;
export default notificationSlice.reducer;