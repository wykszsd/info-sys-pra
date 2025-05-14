import axiosInstance from '../../../services/axiosInstance';
import type { UserDetail } from '../../../types';
import MOCK_USERS from './mockData/authUsers.json'; // Mock user data

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface LoginResponse {
    token: string;
    // user: User; // Backend might return basic user info, but we'll fetch full UserDetail via /me
}

const login = async (credentials: { username: string; password_hash: string /* Misnomer for mock */ }): Promise<LoginResponse> => {
    if (USE_MOCK_API) {
        console.log('MOCK API: login called with', credentials.username);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const foundUser = MOCK_USERS.find(u => u.username === credentials.username && u.mockPassword === credentials.password_hash);
                if (foundUser) {
                    console.log('MOCK API: login success for', credentials.username);
                    const token = `mock-token-for-${foundUser.username}-${Date.now()}`;
                    // 在真实场景中，token 是后端返回的 JWT
                    // ******** 修复点 1: 将 token 存储到 localStorage，以便模拟的 fetchUserProfile 使用 ********
                    localStorage.setItem('authToken', token);
                    resolve({ token });
                } else {
                    console.log('MOCK API: login failed for', credentials.username);
                    reject({ response: { data: { message: '用户名或密码错误 (模拟)' }, status: 401 } });
                }
            }, 500);
        });
    } else {
        const response = await axiosInstance.post<LoginResponse>('/auth/login', {
            username: credentials.username,
            password: credentials.password_hash // 将明文密码发送到后端进行哈希处理
        });
        // 对于真实的 API，你可能会在这里（或在调用 login 的 thunk/组件中）存储 token
        // localStorage.setItem('authToken', response.data.token);
        return response.data;
    }
};

const fetchUserProfile = async (/* token 可以省略，因为 axiosInstance 会处理它 */): Promise<UserDetail> => {
    if (USE_MOCK_API) {
        console.log('MOCK API: fetchUserProfile called');
        // 模拟基于存储在 localStorage 中的 token 进行获取 (对于模拟来说这种方式可行，但不理想)
        const token = localStorage.getItem('authToken');
        // ******** 修复点 2: 从模拟 token 中正确提取用户名 ********
        // token 格式: mock-token-for-USERNAME-timestamp
        // 以 '-' 分割: ['mock', 'token', 'for', 'USERNAME', 'timestamp']
        // USERNAME 在索引 3 的位置
        const usernameFromToken = token?.split('-')[3]; // 原来是 [2]
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const userDetail = MOCK_USERS.find(u => u.username === usernameFromToken);
                if (userDetail) {
                    console.log('MOCK API: fetchUserProfile success for', userDetail.username);
                    // 返回前省略 mockPassword
                    const { mockPassword, ...restOfUser } = userDetail;
                    resolve(restOfUser as UserDetail);
                } else {
                    console.error('MOCK API: fetchUserProfile failed - user not found for token:', token, 'extracted username:', usernameFromToken);
                    reject({ response: { data: { message: '无效 Token 或用户不存在 (模拟)' }, status: 401 } });
                }
            }, 300);
        });
    } else {
        const response = await axiosInstance.get<{ user: UserDetail }>('/auth/me');
        return response.data.user;
    }
};

export const authApi = {
    login,
    fetchUserProfile,
};