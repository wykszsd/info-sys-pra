import axiosInstance from '../../../../services/axiosInstance'; // Adjust path
import type { Course, CoursePayload } from '../../../../types'; // Adjust path
// Adjust path

// Mock data store
let mockCoursesDb: Course[] = [
    { courseId: 1, courseCode: 'CS101', courseName: '计算机导论', credit: 3, semester: 'spring', year: 2024, maxCapacity: 50, prerequisites: JSON.stringify(['MA100']) },
    { courseId: 2, courseCode: 'CS201', courseName: '数据结构', credit: 4, semester: 'spring', year: 2024, maxCapacity: 40, prerequisites: JSON.stringify(['CS101']) },
    { courseId: 3, courseCode: 'CS102', courseName: 'C语言程序设计', credit: 3, semester: 'fall', year: 2023, maxCapacity: 60, prerequisites: JSON.stringify([]) },
    { courseId: 4, courseCode: 'MA101', courseName: '线性代数', credit: 3, semester: 'spring', year: 2024, maxCapacity: 60, prerequisites: JSON.stringify([]) },
    { courseId: 5, courseCode: 'ENG101', courseName: '大学英语I', credit: 2, semester: 'fall', year: 2023, maxCapacity: 100, prerequisites: JSON.stringify([]) },
];
let nextCourseDbId = Math.max(...mockCoursesDb.map(c => c.courseId), 0) + 1;

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface GetCoursesParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    filter?: { courseName_like?: string; courseCode_like?: string };
}
interface ApiListResponse<T> {
    data: T[];
    totalCount: number;
}

const getCourses = async (params: GetCoursesParams): Promise<ApiListResponse<Course>> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminCourseApi.getCourses with params:", params);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 300));
        let filteredItems = [...mockCoursesDb];

        // Apply filtering
        if (params.filter) {
            if (params.filter.courseName_like) {
                const nameFilter = params.filter.courseName_like.toLowerCase();
                filteredItems = filteredItems.filter(item => item.courseName.toLowerCase().includes(nameFilter));
            }
            if (params.filter.courseCode_like) {
                const codeFilter = params.filter.courseCode_like.toLowerCase();
                filteredItems = filteredItems.filter(item => item.courseCode.toLowerCase().includes(codeFilter));
            }
        }

        // Apply sorting (simple sort by courseCode for mock)
        if (params.sort) {
            const [field, order] = params.sort.split(',');
            if (field === 'courseCode') {
                filteredItems.sort((a, b) => order === 'asc' ? a.courseCode.localeCompare(b.courseCode) : b.courseCode.localeCompare(a.courseCode));
            }
            // Add more sort fields if needed
        }

        const totalCount = filteredItems.length;
        const page = params.page ?? 0;
        const pageSize = params.pageSize ?? 10;
        const paginatedData = filteredItems.slice(page * pageSize, (page + 1) * pageSize);
        return { data: paginatedData, totalCount };
    } else {
        // TODO (Backend): GET /api/courses
        // Params: page, pageSize, sort (e.g., "courseCode,asc"), filter_courseName_like, filter_courseCode_like
        const response = await axiosInstance.get<ApiListResponse<Course>>('admin/courses', { params });
        return response.data; // Assuming backend returns { data: Course[], totalCount: number }
    }
};

const createCourse = async (payload: CoursePayload): Promise<Course> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminCourseApi.createCourse with payload:", payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));
        if (mockCoursesDb.some(c => c.courseCode === payload.courseCode)) {
            throw { response: { data: { message: `课程代码 '${payload.courseCode}' 已存在 (模拟)` } } };
        }
        const newCourse: Course = {
            ...payload,
            courseId: nextCourseDbId++,
            prerequisites: payload.prerequisites || JSON.stringify([]), // Ensure it's a string
        };
        mockCoursesDb.push(newCourse);
        return newCourse;
    } else {
        // TODO (Backend): POST /api/courses
        const response = await axiosInstance.post<Course>('admin/courses', payload);
        return response.data;
    }
};

const updateCourse = async (id: number, payload: Partial<CoursePayload>): Promise<Course> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminCourseApi.updateCourse ${id} with payload:`, payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 200));
        const index = mockCoursesDb.findIndex(c => c.courseId === id);
        if (index === -1) throw { response: { data: { message: "课程未找到 (模拟)" } } };
        // Check for unique code conflict if code is changed
        if (payload.courseCode && payload.courseCode !== mockCoursesDb[index].courseCode && mockCoursesDb.some(c => c.courseId !== id && c.courseCode === payload.courseCode)) {
            throw { response: { data: { message: `更新后的课程代码 '${payload.courseCode}' 已被其他课程使用 (模拟)` } } };
        }
        mockCoursesDb[index] = { ...mockCoursesDb[index], ...payload };
        if (payload.prerequisites !== undefined) { // Ensure prerequisites string is updated
            mockCoursesDb[index].prerequisites = payload.prerequisites;
        }
        return mockCoursesDb[index];
    } else {
        // TODO (Backend): PUT /api/courses/{id}
        const response = await axiosInstance.put<Course>(`admin/courses/${id}`, payload);
        return response.data;
    }
};

const deleteCourse = async (id: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminCourseApi.deleteCourse ${id}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 100));
        const initialLength = mockCoursesDb.length;
        mockCoursesDb = mockCoursesDb.filter(c => c.courseId !== id);
        if (mockCoursesDb.length === initialLength) throw { response: { data: { message: "课程未找到 (模拟)" } } };
        return;
    } else {
        // TODO (Backend): DELETE /api/courses/{id}
        // Backend should handle cascading deletes or integrity checks (e.g., if course is in schedules)
        await axiosInstance.delete(`admin/courses/${id}`);
    }
};

export const adminCourseApi = {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
};