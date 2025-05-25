// src/features/admin/requests/services/adminRequestApi.ts
import axiosInstance from '../../../../services/axiosInstance'; // Adjust path
import type { TeacherRequest, RequestType } from '../../../../types'; // Adjust path
// Adjust path
import MOCK_PENDING_REQUESTS_DATA from './mockData/pendingAdminRequests.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mutable mock data for simulation
// 使用 JSON.parse(JSON.stringify(...)) 来创建 MOCK_PENDING_REQUESTS_DATA 的深拷贝，确保 mockPendingRequestsDb 是可变的
let mockPendingRequestsDb: TeacherRequest[] = JSON.parse(JSON.stringify(MOCK_PENDING_REQUESTS_DATA));

const getPendingRequests = async (filterType: 'all' | RequestType): Promise<TeacherRequest[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminRequestApi.getPendingRequests with filter:", filterType);
        await new Promise(res => setTimeout(res, 250 + Math.random() * 200));
        // 确保总是从最新的 mockPendingRequestsDb 状态过滤
        let results = mockPendingRequestsDb.filter(r => r.status === 'pending'); // Always filter by pending
        if (filterType !== 'all') {
            results = results.filter(r => r.requestType === filterType);
        }
        // 返回结果的副本，以防止外部直接修改 getPendingRequests 的结果影响 mockPendingRequestsDb 内部状态 (可选，但更安全)
        return JSON.parse(JSON.stringify(results));
    } else {
        // TODO (Backend): GET /api/requests/pending
        // Params: type ('schedule_change', 'exam_arrangement', or omit for all)
        const params = filterType === 'all' ? {} : { type: filterType };
        const response = await axiosInstance.get<TeacherRequest[]>('admin/requests/pending', { params });
        return response.data;
    }
};

const approveRequest = async (requestId: number): Promise<{ success: boolean, message?: string }> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminRequestApi.approveRequest for ID ${requestId}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 200));
        const index = mockPendingRequestsDb.findIndex(r => r.requestId === requestId && r.status === 'pending');
        if (index === -1) {
            // 更符合实际的错误抛出方式，与 axios 错误结构类似
            const error = new Error('待审批请求未找到或已被处理 (模拟)');
            (error as any).response = { data: { message: '待审批请求未找到或已被处理 (模拟)' } };
            throw error;
        }

        // 获取原始请求对象的引用
        const originalRequest = mockPendingRequestsDb[index];

        // 创建一个新对象进行修改，以避免直接修改可能存在的只读对象
        const updatedRequest: TeacherRequest = {
            ...originalRequest, // 复制原始请求的所有属性
            status: 'approved', // 修改状态
            processedAt: new Date().toISOString(), // 添加处理时间
            approverInfo: '模拟管理员', // 添加审批人信息
        };

        // 用更新后的对象替换数组中的旧对象
        mockPendingRequestsDb[index] = updatedRequest;

        // 如果 UI 依赖于此列表在批准后立即移除项目，可以这样做：
        // mockPendingRequestsDb = mockPendingRequestsDb.filter(r => r.requestId !== requestId || r.status !== 'approved'); 
        // 但通常情况下，保留已批准的记录在 'pending' 过滤视图中不可见即可，
        // 如果有 "所有请求" 视图，则此条目状态会更新为 'approved'。

        return { success: true, message: `请求 #${requestId} 已批准 (模拟)` };
    } else {
        // TODO (Backend): POST /api/requests/{requestId}/approve
        // Backend handles all state changes, schedule updates, notifications.
        const response = await axiosInstance.post<{ success: boolean, message?: string }>(`admin/requests/${requestId}/approve`);
        return response.data;
    }
};

const rejectRequest = async (requestId: number, reason: string): Promise<{ success: boolean, message?: string }> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminRequestApi.rejectRequest ID ${requestId} with reason: ${reason}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 200));
        const index = mockPendingRequestsDb.findIndex(r => r.requestId === requestId && r.status === 'pending');
        if (index === -1) {
            const error = new Error('待审批请求未找到或已被处理 (模拟)');
            (error as any).response = { data: { message: '待审批请求未找到或已被处理 (模拟)' } };
            throw error;
        }

        const originalRequest = mockPendingRequestsDb[index];

        // 创建一个新对象进行修改
        const updatedRequest: TeacherRequest = {
            ...originalRequest,
            status: 'rejected',
            rejectReason: reason,
            processedAt: new Date().toISOString(),
            approverInfo: '模拟管理员',
        };

        mockPendingRequestsDb[index] = updatedRequest;

        return { success: true, message: `请求 #${requestId} 已拒绝 (模拟)` };
    } else {
        // TODO (Backend): POST /api/requests/{requestId}/reject
        // Body: { reason: string }
        // Backend handles state changes and notifications.
        const response = await axiosInstance.post<{ success: boolean, message?: string }>(`admin/requests/${requestId}/reject`, { reason });
        return response.data;
    }
};

export const adminRequestApi = {
    getPendingRequests,
    approveRequest,
    rejectRequest,
};