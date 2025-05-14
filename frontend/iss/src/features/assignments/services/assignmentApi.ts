// src/features/assignments/services/assignmentApi.ts
import axiosInstance from '../../../services/axiosInstance'; // Adjust path
import type { AssignmentPayload, Course } from '../../../types'; // Adjust path
// Adjust path
// Mock Data
import MOCK_TEACHER_COURSES_FOR_ASSIGNMENT from './mockData/teacherCoursesForAssignment.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const getCoursesTaughtByTeacher = async (semesterId: number): Promise<Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: assignmentApi.getCoursesTaughtByTeacher for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 100));
        // Mock should ideally filter by semester if data contains multiple semesters

        return [...MOCK_TEACHER_COURSES_FOR_ASSIGNMENT];
    } else {
        // TODO (Backend): GET /api/courses/my-taught?semesterId={semesterId}
        // This endpoint should return a simplified list of courses the teacher teaches.
        const response = await axiosInstance.get(`/courses/my-taught`, { params: { semesterId } });
        return response.data;
    }
};

const submitAssignment = async (payload: AssignmentPayload): Promise<{ message: string }> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: assignmentApi.submitAssignment called with payload:", payload);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 300));
        // Simulate success
        return { message: "作业通知已成功发布 (模拟)" };
    } else {
        // TODO (Backend): POST /api/assignments
        // Backend will create notification records for all students in the target course/class.
        const response = await axiosInstance.post('/assignments', payload);
        return response.data; // Expects a success message or similar
    }
};

export const assignmentApi = {
    getCoursesTaughtByTeacher,
    submitAssignment,
};