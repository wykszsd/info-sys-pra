// src/features/requests/services/requestApi.ts
import axiosInstance from '../../../services/axiosInstance';
import type { ScheduleChangeRequestPayload, ExamRequestPayload, TeacherRequest, Schedule } from '../../../types';
import MOCK_ALL_TEACHER_SCHEDULES_SEMESTER_1 from './mockData/teacherSchedules.json';
import MOCK_MY_REQUESTS_DATA from './mockData/myRequests.json';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

let mockMyRequests: TeacherRequest[] = JSON.parse(JSON.stringify(MOCK_MY_REQUESTS_DATA));
let nextRequestId = Math.max(0, ...mockMyRequests.map(r => r.requestId)) + 1;

const getMySchedulesForSemester = async (semesterId: number): Promise<Schedule[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: requestApi.getMySchedulesForSemester for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 100));
        if (semesterId === 1) { // Assuming mock data is for semesterId 1
            return [...MOCK_ALL_TEACHER_SCHEDULES_SEMESTER_1] as Schedule[];
        }
        console.warn(`MOCK API: No mock data for semesterId ${semesterId}, returning empty array.`);
        return [];
    } else {
        console.log(`REAL API: Calling /schedules/my-taught for semesterId: ${semesterId}`);
        const response = await axiosInstance.get(`/schedules/my-taught`, { params: { semesterId } });
        console.log(`REAL API: Response from /schedules/my-taught:`, response.data);
        // It's crucial that response.data is Schedule[]
        // Add a check here for development/debugging:
        if (!Array.isArray(response.data)) {
            console.error("API /schedules/my-taught did not return an array. Response:", response);
            throw new Error("API response for teacher schedules is not an array.");
        }
        // You might also want to validate the structure of the first item if data is present
        if (response.data.length > 0) {
            const firstItem = response.data[0];
            if (typeof firstItem.scheduleId !== 'number' || typeof firstItem.courseName !== 'string' /* add more checks */) {
                console.warn("API /schedules/my-taught returned items with unexpected structure:", firstItem);
            }
        }
        return response.data;
    }
};

const submitScheduleChange = async (payload: ScheduleChangeRequestPayload): Promise<TeacherRequest> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: requestApi.submitScheduleChange with payload:", payload);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 300));
        if (!payload.reason) throw { response: { data: { message: '必须填写调课原因 (模拟)' } } };
        const newRequest: TeacherRequest = {
            requestId: nextRequestId++, requestType: 'schedule_change', status: 'pending',
            requestedAt: new Date().toISOString(), ...payload,
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
            requestId: nextRequestId++, requestType: 'exam_arrangement', status: 'pending',
            requestedAt: new Date().toISOString(), ...payload, examReason: payload.reason,
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
    getMySchedulesForSemester,
    submitScheduleChange,
    submitExamRequest,
    getMyRequests,
};