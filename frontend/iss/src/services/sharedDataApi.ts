
// src/services/sharedDataApi.ts
import axiosInstance from './axiosInstance'; // 调整路径
import type { Course, TeacherInfo, Classroom } from '../types'; // 调整路径

// 从集中的 JSON 文件导入模拟数据
// 这些路径是相对于 src/services/sharedDataApi.ts 的
// 并指向现在也被 adminScheduleApi.ts 使用的文件
import MOCK_COURSES_SHORT from './mockData/coursesShort.json';
import MOCK_TEACHERS_LIST from './mockData/teachers.json';
import MOCK_CLASSROOMS_SHORT from './mockData/classroomsShort.json';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// API 函数
const getAllCoursesShort = async (): Promise<Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: sharedDataApi.getAllCoursesShort called");
        await new Promise(res => setTimeout(res, 200 + Math.random() * 150));
        // 确保你的 tsconfig.json 的 compilerOptions 中有 "resolveJsonModule": true
        return [...MOCK_COURSES_SHORT]; // 返回一个副本
    } else {
        // TODO (Backend): GET /api/courses/list-short (或类似的轻量级课程列表接口)
        const response = await axiosInstance.get('/courses/list-short');
        return response.data;
    }
};

const getAllTeachers = async (): Promise<TeacherInfo[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: sharedDataApi.getAllTeachers called");
        await new Promise(res => setTimeout(res, 200 + Math.random() * 150));
        return [...MOCK_TEACHERS_LIST]; // 返回一个副本
    } else {
        // TODO (Backend): GET /api/teachers/list (或类似的教师列表接口: id, name, department)
        const response = await axiosInstance.get('/teachers/list');
        return response.data;
    }
};

const getAllClassroomsList = async (): Promise<Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: sharedDataApi.getAllClassroomsList called");
        await new Promise(res => setTimeout(res, 200 + Math.random() * 150));
        return [...MOCK_CLASSROOMS_SHORT]; // 返回一个副本
    } else {
        // TODO (Backend): GET /api/classrooms/list-short (或类似的轻量级教室列表接口)
        const response = await axiosInstance.get('/classrooms/list-short');
        return response.data;
    }
};

export const sharedDataApi = {
    getAllCoursesShort,
    getAllTeachers,
    getAllClassroomsList,
};