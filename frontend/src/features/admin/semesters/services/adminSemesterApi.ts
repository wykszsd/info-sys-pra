import axiosInstance from '../../../../services/axiosInstance';
import type { SemesterInfo, SemesterPayload } from '../../../../types';

// 初始模拟数据定义
const initialMockSemestersData: SemesterInfo[] = [
    { semesterId: 1, semesterName: "2023年秋季学期", startDate: "2023-09-01", endDate: "2024-01-15", termType: "fall", academicYear: "2023-2024", isCurrent: false },
    { semesterId: 2, semesterName: "2024年春季学期", startDate: "2024-02-26", endDate: "2024-07-07", termType: "spring", academicYear: "2023-2024", isCurrent: true },
    { semesterId: 3, semesterName: "2024年秋季学期", startDate: "2024-09-02", endDate: "2025-01-12", termType: "fall", academicYear: "2024-2025", isCurrent: false },
];

// 为模拟数据库创建深度可变副本
let mockSemestersDb: SemesterInfo[] = JSON.parse(JSON.stringify(initialMockSemestersData));

// 根据可变的模拟数据库计算下一个 ID
let nextSemesterDbId = mockSemestersDb.length > 0
    ? Math.max(...mockSemestersDb.map(s => s.semesterId)) + 1
    : 1;

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface ApiListResponse<T> { data: T[]; totalCount: number; }
interface GetSemestersParams { page?: number; pageSize?: number; sort?: string; }

const getSemesters = async (params: GetSemestersParams): Promise<ApiListResponse<SemesterInfo>> => {
    if (USE_MOCK_API) {
        console.log("MOCK API (模拟): adminSemesterApi.getSemesters 参数:", params);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 100));

        // 创建一个新数组进行排序，避免直接修改 mockSemestersDb 的顺序
        const sortedSemesters = [...mockSemestersDb].sort((a, b) => {
            if (a.academicYear !== b.academicYear) {
                return b.academicYear.localeCompare(a.academicYear); // 学年降序
            }
            // 学期类型排序：春季 (spring) 在前，秋季 (fall) 在后
            const termOrder = { spring: 1, fall: 2 }; // 定义学期类型的顺序
            return (termOrder[a.termType] || 99) - (termOrder[b.termType] || 99);
        });

        const page = params.page ?? 0;
        const pageSize = params.pageSize ?? 10;
        const paginated = sortedSemesters.slice(page * pageSize, (page + 1) * pageSize);

        // 返回分页数据的深拷贝
        return { data: JSON.parse(JSON.stringify(paginated)), totalCount: sortedSemesters.length };
    } else {
        const response = await axiosInstance.get<ApiListResponse<SemesterInfo>>('admin/semesters', { params });
        return response.data;
    }
};

const createSemester = async (payload: SemesterPayload): Promise<SemesterInfo> => {
    if (USE_MOCK_API) {
        console.log("MOCK API (模拟): adminSemesterApi.createSemester 数据:", payload);
        await new Promise(res => setTimeout(res, 300));
        if (mockSemestersDb.some(s => s.academicYear === payload.academicYear && s.termType === payload.termType)) {
            const message = `学期 ${payload.academicYear} ${payload.termType === 'spring' ? '春季' : '秋季'} 已存在 (模拟)`;
            const error = new Error(message);
            (error as any).response = { data: { message } };
            throw error;
        }
        const newSemester: SemesterInfo = {
            ...payload,
            semesterId: nextSemesterDbId++,
            isCurrent: false // 新创建的学期默认不是当前学期
        };
        mockSemestersDb.push(newSemester); // push 的是新创建的可变对象

        // 返回创建的学期对象的副本
        return { ...newSemester };
    } else {
        const response = await axiosInstance.post<SemesterInfo>('admin/semesters', payload);
        return response.data;
    }
};

const updateSemester = async (id: number, payload: Partial<SemesterPayload>): Promise<SemesterInfo> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API (模拟): adminSemesterApi.updateSemester ID ${id} 数据:`, payload);
        await new Promise(res => setTimeout(res, 300));
        const index = mockSemestersDb.findIndex(s => s.semesterId === id);
        if (index === -1) {
            const message = "学期未找到 (模拟)";
            const error = new Error(message);
            (error as any).response = { data: { message } };
            throw error;
        }

        const originalSemester = mockSemestersDb[index];

        // 如果学年或学期类型被更改，检查唯一性约束
        if (payload.academicYear || payload.termType) {
            const checkYear = payload.academicYear ?? originalSemester.academicYear;
            const checkTerm = payload.termType ?? originalSemester.termType;
            if (mockSemestersDb.some(s => s.semesterId !== id && s.academicYear === checkYear && s.termType === checkTerm)) {
                const message = `更新后的学期 ${checkYear} ${checkTerm === 'spring' ? '春季' : '秋季'} 已存在 (模拟)`;
                const error = new Error(message);
                (error as any).response = { data: { message } };
                throw error;
            }
        }

        // 创建一个新的更新后的对象
        const updatedSemester: SemesterInfo = {
            ...originalSemester,
            ...payload,
            semesterId: id // 确保 semesterId 不被 payload 修改 (SemesterPayload 类型中不包含 semesterId)
        };
        mockSemestersDb[index] = updatedSemester; // 用新对象替换旧对象

        // 返回更新后的学期对象的副本
        return { ...updatedSemester };
    } else {
        const response = await axiosInstance.put<SemesterInfo>(`admin/semesters/${id}`, payload);
        return response.data;
    }
};

const deleteSemester = async (id: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API (模拟): adminSemesterApi.deleteSemester ID ${id}`);
        await new Promise(res => setTimeout(res, 400));
        const semesterToDelete = mockSemestersDb.find(s => s.semesterId === id);
        if (!semesterToDelete) {
            const message = "学期未找到 (模拟)";
            const error = new Error(message);
            (error as any).response = { data: { message } };
            throw error;
        }
        if (semesterToDelete.isCurrent) {
            const message = "不能删除当前激活的学期 (模拟)";
            const error = new Error(message);
            (error as any).response = { data: { message } };
            throw error;
        }
        // filter 方法会返回一个新数组，这符合要求
        mockSemestersDb = mockSemestersDb.filter(s => s.semesterId !== id);
        return; // void 返回类型
    } else {
        await axiosInstance.delete(`admin/semesters/${id}`);
    }
};

const activateSemester = async (id: number): Promise<{ success: boolean }> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API (模拟): adminSemesterApi.activateSemester ID ${id}`);
        await new Promise(res => setTimeout(res, 300));
        const targetExists = mockSemestersDb.some(s => s.semesterId === id);
        if (!targetExists) {
            const message = "学期未找到 (模拟)";
            const error = new Error(message);
            (error as any).response = { data: { message } };
            throw error;
        }

        // 使用 map 创建一个包含新对象的新数组，并更新 isCurrent 属性
        mockSemestersDb = mockSemestersDb.map(s => ({
            ...s, // 扩展运算创建每个学期对象的新副本
            isCurrent: s.semesterId === id, // 根据目标ID设置 isCurrent 状态
        }));

        return { success: true };
    } else {
        const response = await axiosInstance.post<{ success: boolean }>(`admin/semesters/${id}/activate`);
        return response.data;
    }
};

export const adminSemesterApi = { getSemesters, createSemester, updateSemester, deleteSemester, activateSemester };