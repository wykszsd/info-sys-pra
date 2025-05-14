import axiosInstance from '../../../../services/axiosInstance'; // Adjust path
import type { UserDetail, UserPayload, UserRole } from '../../../../types'; // Adjust path
// Adjust path
import MOCK_ADMIN_USERS_DATA from './mockData/adminUsers.json'; // Adjust path

let mockUsersDb: UserDetail[] = JSON.parse(JSON.stringify(MOCK_ADMIN_USERS_DATA));
let nextUserDbId = Math.max(0, ...mockUsersDb.map(u => u.userId)) + 1;

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface GetUsersParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filterRole?: UserRole | 'all';
    filterUsername?: string;
}
interface ApiListResponse<T> {
    data: T[];
    totalCount: number;
}

const getUsers = async (params: GetUsersParams): Promise<ApiListResponse<UserDetail>> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminUserApi.getUsers with params:", params);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 300));
        let filteredItems = [...mockUsersDb];

        if (params.filterRole && params.filterRole !== 'all') {
            filteredItems = filteredItems.filter(u => u.role === params.filterRole);
        }
        if (params.filterUsername) {
            const nameFilter = params.filterUsername.toLowerCase();
            filteredItems = filteredItems.filter(u => u.username.toLowerCase().includes(nameFilter));
        }
        // TODO (Mock): Add sorting logic if params.sort is provided

        const totalCount = filteredItems.length;
        const page = params.page ?? 0;
        const pageSize = params.pageSize ?? 10;
        const paginatedData = filteredItems.slice(page * pageSize, (page + 1) * pageSize);
        return { data: paginatedData, totalCount };
    } else {
        // TODO (Backend): GET /api/users
        // Params: page, pageSize, sort, filterRole, filterUsername
        const response = await axiosInstance.get<ApiListResponse<UserDetail>>('admin/users', { params });
        // Ensure backend response matches ApiListResponse<UserDetail>
        return response.data;
    }
};

const createUser = async (payload: UserPayload): Promise<UserDetail> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminUserApi.createUser with payload:", payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));
        if (mockUsersDb.some(u => u.username === payload.username)) {
            throw { response: { data: { message: `用户名 '${payload.username}' 已存在 (模拟)` } } };
        }
        if (!payload.password || payload.password.length < 6) {
            throw { response: { data: { message: '创建用户时密码至少需要6位 (模拟)' } } };
        }
        const newUser: UserDetail = {
            userId: nextUserDbId++,
            username: payload.username,
            role: payload.role,
            email: payload.email,
            phone: payload.phone,
            // Add student/teacher specifics based on role
            ...(payload.role === 'student' && {
                studentId: payload.username, // Assuming username is studentId
                class_name: payload.class_name,
                enrollment_year: payload.enrollment_year,
            }),
            ...(payload.role === 'teacher' && {
                teacherId: payload.username, // Assuming username is teacherId
                department: payload.department,
                title: payload.title,
            }),
            // mockPassword would be hashed by backend in real scenario
        };
        mockUsersDb.push(newUser);
        // Return without mockPassword
        const { mockPassword, ...userToReturn } = newUser as any;
        return userToReturn as UserDetail;
    } else {
        // TODO (Backend): POST /api/users
        // Backend handles password hashing and creating related student/teacher record.
        const response = await axiosInstance.post<UserDetail>('admin/users', payload);
        return response.data;
    }
};

const updateUser = async (id: number, payload: Partial<UserPayload>): Promise<UserDetail> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminUserApi.updateUser ${id} with payload:`, payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));
        const index = mockUsersDb.findIndex(u => u.userId === id);
        if (index === -1) throw { response: { data: { message: "用户未找到 (模拟)" } } };

        // In mock, directly update. Real backend might have more complex logic.
        // Exclude username and role from being updated in this simple mock update
        const { username, role, password, ...updateData } = payload;
        mockUsersDb[index] = { ...mockUsersDb[index], ...updateData };

        // Update role-specific fields if present in payload and role matches
        if (mockUsersDb[index].role === 'student' && updateData.class_name !== undefined) {
            mockUsersDb[index].class_name = updateData.class_name;
        }
        if (mockUsersDb[index].role === 'student' && updateData.enrollment_year !== undefined) {
            mockUsersDb[index].enrollment_year = updateData.enrollment_year;
        }
        if (mockUsersDb[index].role === 'teacher' && updateData.department !== undefined) {
            mockUsersDb[index].department = updateData.department;
        }
        if (mockUsersDb[index].role === 'teacher' && updateData.title !== undefined) {
            mockUsersDb[index].title = updateData.title;
        }

        // If password is in payload, simulate password reset (real BE would re-hash)
        if (payload.password) {
            (mockUsersDb[index] as any).mockPassword = payload.password; // Simulate password change
            console.log(`MOCK API: Password for user ${id} "changed" to ${payload.password}`);
        }

        const { mockPassword, ...userToReturn } = mockUsersDb[index] as any;
        return userToReturn as UserDetail;
    } else {
        // TODO (Backend): PUT /api/users/{id}
        // Backend handles updating users and related student/teacher tables.
        // Password update should ideally be a separate endpoint or require current password.
        const { password, ...updateData } = payload; // Send password only if it's part of this update logic
        const response = await axiosInstance.put<UserDetail>(`admin/users/${id}`, updateData);
        return response.data;
    }
};

const deleteUser = async (id: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminUserApi.deleteUser ${id}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 100));
        const initialLength = mockUsersDb.length;
        mockUsersDb = mockUsersDb.filter(u => u.userId !== id);
        if (mockUsersDb.length === initialLength) throw { response: { data: { message: "用户未找到 (模拟)" } } };
        return;
    } else {
        // TODO (Backend): DELETE /api/users/{id}
        // Backend should handle cascading deletes or set an inactive flag.
        await axiosInstance.delete(`admin/users/${id}`);
    }
};

// Optional: API for resetting password
// const resetUserPassword = async (userId: number, newPassword Plaintext: string) => { ... }

export const adminUserApi = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};