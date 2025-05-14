//@ts-nocheck
// src/features/courses/services/courseApi.ts
import axiosInstance from '../../../services/axiosInstance';
import type { SelectableCourse, EnrollmentRecord } from '../../../types'; // Adjust path
// Adjust path

// Mock Data Imports
import MOCK_SELECTABLE_COURSES_DATA from './mockData/selectableCourses.json'; // Adjust path
import MOCK_MY_ENROLLMENTS_DATA from './mockData/myEnrollments.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// Mutable mock data for simulation
let mockSelectableCourses: SelectableCourse[] = JSON.parse(JSON.stringify(MOCK_SELECTABLE_COURSES_DATA));
let mockMyEnrollments: EnrollmentRecord[] = JSON.parse(JSON.stringify(MOCK_MY_ENROLLMENTS_DATA));
let mockEnrollmentIdCounter = Math.max(0, ...mockMyEnrollments.map(e => e.enrollmentId)) + 1;

const getSelectableCourses = async (semesterId: number): Promise<SelectableCourse[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: courseApi.getSelectableCourses for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 300));
        // Update enrolledCount based on mockMyEnrollments for the mock response
        return mockSelectableCourses.map(course => ({
            ...course,
            enrolledCount: mockMyEnrollments.filter(e => e.scheduleId === course.scheduleId && e.status === 'enrolled').length
        }));
    } else {
        // TODO (Backend): GET /api/courses/selectable?semesterId={semesterId}
        // Backend should return SelectableCourse[] including 'enrolledCount' and 'maxCapacity'
        const response = await axiosInstance.get(`/courses/selectable`, { params: { semesterId } });
        return response.data;
    }
};

const getMyEnrollments = async (semesterId: number): Promise<EnrollmentRecord[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: courseApi.getMyEnrollments for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
        // Return only 'enrolled' for simplicity, or handle 'withdrawn' if needed
        return mockMyEnrollments.filter(e => e.status === 'enrolled');
    } else {
        // TODO (Backend): GET /api/enrollments/my?semesterId={semesterId}
        // Backend should filter by logged-in student and return EnrollmentRecord[]
        // Optionally join with schedule/course info if frontend needs it directly.
        const response = await axiosInstance.get(`/enrollments/my`, { params: { semesterId } });
        return response.data;
    }
};

const enrollInCourse = async (scheduleId: number): Promise<EnrollmentRecord> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: courseApi.enrollInCourse for schedule ${scheduleId}`);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));

        const courseToEnroll = mockSelectableCourses.find(c => c.scheduleId === scheduleId);
        if (!courseToEnroll) {
            throw { response: { data: { message: '课程不存在 (模拟)' }, status: 404 } };
        }
        const alreadyEnrolled = mockMyEnrollments.some(e => e.scheduleId === scheduleId && e.status === 'enrolled');
        if (alreadyEnrolled) {
            throw { response: { data: { message: '您已选择此课程 (模拟)' }, status: 400 } };
        }
        const currentEnrolledCount = mockMyEnrollments.filter(e => e.scheduleId === scheduleId && e.status === 'enrolled').length;
        if (currentEnrolledCount >= courseToEnroll.maxCapacity) {
            throw { response: { data: { message: '课程容量已满 (模拟)' }, status: 400 } };
        }

        const newEnrollment: EnrollmentRecord = {
            enrollmentId: mockEnrollmentIdCounter++,
            studentId: 'S_MOCK_USER', // Mock student ID, replace with actual if available
            scheduleId: scheduleId,
            enrollmentTime: new Date().toISOString(),
            status: 'enrolled',
        };
        mockMyEnrollments.push(newEnrollment);
        // Update enrolledCount in the mockSelectableCourses for next fetch
        const courseIndex = mockSelectableCourses.findIndex(c => c.scheduleId === scheduleId);
        if (courseIndex !== -1 && mockSelectableCourses[courseIndex].enrolledCount !== undefined) {
            mockSelectableCourses[courseIndex].enrolledCount!++;
        }
        return newEnrollment;
    } else {
        // TODO (Backend): POST /api/enrollments (body: { scheduleId })
        // Backend handles capacity check, duplicate check, creates enrollment record.
        const response = await axiosInstance.post('/enrollments', { scheduleId });
        return response.data; // Expects newly created EnrollmentRecord
    }
};

// Pass scheduleId to mock for updating enrolledCount on selectable courses
const withdrawFromCourse = async (enrollmentId: number, scheduleIdForMockUpdate?: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: courseApi.withdrawFromCourse for enrollment ${enrollmentId}`);
        await new Promise(res => setTimeout(res, 250 + Math.random() * 150));
        const enrollmentIndex = mockMyEnrollments.findIndex(e => e.enrollmentId === enrollmentId && e.status === 'enrolled');
        if (enrollmentIndex === -1) {
            throw { response: { data: { message: '未找到选课记录或无法退课 (模拟)' }, status: 404 } };
        }
        const withdrawnScheduleId = scheduleIdForMockUpdate || mockMyEnrollments[enrollmentIndex].scheduleId;
        mockMyEnrollments.splice(enrollmentIndex, 1); // Or mark as 'withdrawn'
        // Update enrolledCount in the mockSelectableCourses for next fetch
        const courseIndex = mockSelectableCourses.findIndex(c => c.scheduleId === withdrawnScheduleId);
        if (courseIndex !== -1 && mockSelectableCourses[courseIndex].enrolledCount !== undefined && mockSelectableCourses[courseIndex].enrolledCount! > 0) {
            mockSelectableCourses[courseIndex].enrolledCount!--;
        }
        return;
    } else {
        // TODO (Backend): DELETE /api/enrollments/{enrollmentId}
        // Backend handles setting status to 'withdrawn' or deleting record, and updating counts.
        await axiosInstance.delete(`/enrollments/${enrollmentId}`);
        return;
    }
};

export const courseApi = {
    getSelectableCourses,
    getMyEnrollments,
    enrollInCourse,
    withdrawFromCourse,
};