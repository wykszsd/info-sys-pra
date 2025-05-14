// src/features/requests/services/requestApi.ts
import axiosInstance from '../../../services/axiosInstance'; // Adjust path
import type { ScheduleChangeRequestPayload, ExamRequestPayload, TeacherRequest, Schedule } from '../../../types'; // Adjust path, Added Schedule type
// Adjust path
// Mock Data Imports
import MOCK_ALL_TEACHER_SCHEDULES_SEMESTER_1 from './mockData/teacherSchedules.json'; // <-- 使用你提供的文件
import MOCK_MY_REQUESTS_DATA from './mockData/myRequests.json'; // Ensure this contains requestType
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mutable mock data for simulation
let mockMyRequests: TeacherRequest[] = JSON.parse(JSON.stringify(MOCK_MY_REQUESTS_DATA));
let nextRequestId = Math.max(0, ...mockMyRequests.map(r => r.requestId)) + 1;


// --- 新增函数：获取教师在一个学期内的所有课程安排 ---
const getMySchedulesForSemester = async (semesterId: number): Promise<Schedule[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: requestApi.getMySchedulesForSemester for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 100));
        // 实际应用中，你可能需要根据 semesterId 筛选或加载不同的 mock 文件
        // 这里我们假设 teacherSchedules.json 就是 semesterId 为 1 的数据
        if (semesterId === 1) { // 假设你的 currentSemester.semesterId 在 mock 环境下是 1
            return [...MOCK_ALL_TEACHER_SCHEDULES_SEMESTER_1] as Schedule[];
        }
        // 如果是其他学期ID，可以返回空数组或加载对应的 mock 数据
        console.warn(`MOCK API: requestApi.getMySchedulesForSemester - No mock data for semesterId ${semesterId}, returning empty array.`);
        return [];
    } else {
        // TODO (Backend): GET /api/schedules/my-taught?semesterId={semesterId}
        // 这个后端接口应该返回该教师在该学期的所有 Schedule 对象
        const response = await axiosInstance.get(`/schedules/my-taught`, { params: { semesterId } });
        return response.data;
    }
};
// --- 结束新增函数 ---


const submitScheduleChange = async (payload: ScheduleChangeRequestPayload): Promise<TeacherRequest> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: requestApi.submitScheduleChange with payload:", payload);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 300));
        if (!payload.reason) throw { response: { data: { message: '必须填写调课原因 (模拟)' } } };
        const newRequest: TeacherRequest = {
            requestId: nextRequestId++,
            requestType: 'schedule_change',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            ...payload,
            originalScheduleInfo: `原课程ID: ${payload.originalScheduleId}`,
            proposedClassroomInfo: `教室ID: ${payload.proposedClassroomId}`,
            courseName: `课程 (ID:${payload.originalScheduleId})`,
        };
        mockMyRequests.unshift(newRequest);
        return newRequest;
    } else {
        const response = await axiosInstance.post('/requests/schedule-change', payload);
        return response.data;
    }
};

const submitExamRequest = async (payload: ExamRequestPayload): Promise<TeacherRequest> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: requestApi.submitExamRequest with payload:", payload);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 300));
        if (!payload.reason) throw { response: { data: { message: '必须填写申请原因 (模拟)' } } };
        const newRequest: TeacherRequest = {
            requestId: nextRequestId++,
            requestType: 'exam_arrangement',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            ...payload,
            examReason: payload.reason,
            courseName: `课程 (ID:${payload.courseId})`,
            proposedClassroomInfo: `教室ID: ${payload.proposedClassroomId}`,
        };
        mockMyRequests.unshift(newRequest);
        return newRequest;
    } else {
        const response = await axiosInstance.post('/requests/exam-arrangement', payload);
        return response.data;
    }
};

const getMyRequests = async (): Promise<TeacherRequest[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: requestApi.getMyRequests called");
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));
        return [...mockMyRequests].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    } else {
        const response = await axiosInstance.get('/requests/my');
        return response.data;
    }
};

export const requestApi = {
    getMySchedulesForSemester, // <-- 导出新函数
    submitScheduleChange,
    submitExamRequest,
    getMyRequests,
};