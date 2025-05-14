// src/features/notifications/services/notificationApi.ts
import axiosInstance from '../../../services/axiosInstance';
import type { Notification } from '../../../types'; // Adjust path
// Adjust path
import MOCK_NOTIFICATIONS_DATA from './mockData/notifications.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mutable copy for mock operations
let mockUserNotifications: Notification[] = JSON.parse(JSON.stringify(MOCK_NOTIFICATIONS_DATA));

const getMyNotifications = async (params: { unread?: boolean } = {}): Promise<Notification[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: notificationApi.getMyNotifications with params:", params);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 200));

        let currentNotifications = [...mockUserNotifications]; // Work with a copy of the array
        let results = currentNotifications;

        if (params.unread) {
            results = results.filter(n => !n.isRead);
        }

        // --- FIX FOR "Cannot assign to read only property" (by returning new objects) ---
        return results
            .sort((a, b) => new Date(b.notifyTime).getTime() - new Date(a.notifyTime).getTime())
            .map(n => ({ ...n })); // Return new object instances
        // --- END OF FIX ---
    } else {
        // TODO (Backend): GET /api/notifications/my
        // Params: unread (boolean, optional)
        // Backend should filter by logged-in user
        const response = await axiosInstance.get('/notifications/my', { params });
        return response.data;
    }
};

const markAsRead = async (notificationId: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: notificationApi.markAsRead for ID ${notificationId}`);
        await new Promise(res => setTimeout(res, 50 + Math.random() * 100));
        const index = mockUserNotifications.findIndex(n => n.notificationId === notificationId);
        if (index !== -1) {
            // --- FIX FOR "Cannot assign to read only property" (immutable update) ---
            mockUserNotifications[index] = {
                ...mockUserNotifications[index],
                isRead: true,
            };
            // --- END OF FIX ---
        } else {
            console.warn(`MOCK API: Notification with ID ${notificationId} not found for marking as read.`);
            // throw new Error("Notification not found (mock)"); // Optional: throw error
        }
        return;
    } else {
        // TODO (Backend): POST /api/notifications/{notificationId}/read
        await axiosInstance.post(`/notifications/${notificationId}/read`);
    }
};

const markAllAsRead = async (): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: notificationApi.markAllAsRead`);
        await new Promise(res => setTimeout(res, 100 + Math.random() * 150));
        // --- FIX FOR "Cannot assign to read only property" (immutable update) ---
        mockUserNotifications = mockUserNotifications.map(n =>
            n.isRead ? n : { ...n, isRead: true }
        );
        // --- END OF FIX ---
        return;
    } else {
        // TODO (Backend): POST /api/notifications/mark-all-read
        // Backend marks all notifications for the logged-in user as read
        await axiosInstance.post(`/notifications/mark-all-read`);
    }
};

export const notificationApi = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
};