
import axiosInstance from '../../../../services/axiosInstance'; // Adjust path
import type { Schedule, SchedulePayload } from '../../../../types'; // Adjust path
// Adjust path
import MOCK_ADMIN_SCHEDULES_DATA from './mockData/adminSchedules.json'; // Adjust path
// Import other necessary mock data for resolving names if not done by backend
import MOCK_COURSES_SHORT from '../../../../services/mockData/coursesShort.json'; // adjust path
import MOCK_TEACHERS_LIST from '../../../../services/mockData/teachers.json'; // adjust path
import MOCK_CLASSROOMS_SHORT from '../../../../services/mockData/classroomsShort.json'; // adjust path
import MOCK_SECTIONS_LIST from '../../../timetable/services/mockData/sections.json'; // adjust path


let mockSchedulesDb: Schedule[] = JSON.parse(JSON.stringify(MOCK_ADMIN_SCHEDULES_DATA));
// Enhance mock schedules with resolved names if not already present
mockSchedulesDb.forEach(s => {
    if (!s.courseName) {
        const course = MOCK_COURSES_SHORT.find(c => c.courseId === s.courseId);
        s.courseName = course?.courseName;
        s.courseCode = course?.courseCode;
    }
    if (!s.teacherName) {
        s.teacherName = MOCK_TEACHERS_LIST.find(t => t.teacherId === s.teacherId)?.name;
    }
    if (!s.building || !s.roomNumber) {
        const classroom = MOCK_CLASSROOMS_SHORT.find(c => c.classroomId === s.classroomId);
        s.building = classroom?.building;
        s.roomNumber = classroom?.roomNumber;
    }
    if (!s.startTime || !s.endTime) {
        const section = MOCK_SECTIONS_LIST.find(sec => sec.sectionId === s.sectionId);
        s.startTime = section?.startTime;
        s.endTime = section?.endTime;
    }
});

let nextScheduleDbId = Math.max(0, ...mockSchedulesDb.map(s => s.scheduleId)) + 1;
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface GetSchedulesParams {
    page?: number; pageSize?: number; sort?: string;
    filterCourseId?: number | null; filterTeacherId?: string | null;
    filterClassroomId?: number | null; filterSemesterId?: number | null;
}
interface ApiListResponse<T> { data: T[]; totalCount: number; }

const getSchedules = async (params: GetSchedulesParams): Promise<ApiListResponse<Schedule>> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminScheduleApi.getSchedules with params:", params);
        await new Promise(res => setTimeout(res, 250 + Math.random() * 250));
        let filteredItems = [...mockSchedulesDb];
        // TODO (Mock): Implement filtering by semesterId if mock data has semester info.
        // For now, mock doesn't filter by semester.
        if (params.filterCourseId) filteredItems = filteredItems.filter(s => s.courseId === params.filterCourseId);
        if (params.filterTeacherId) filteredItems = filteredItems.filter(s => s.teacherId === params.filterTeacherId);
        if (params.filterClassroomId) filteredItems = filteredItems.filter(s => s.classroomId === params.filterClassroomId);
        // TODO (Mock): Implement sorting

        const totalCount = filteredItems.length;
        const page = params.page ?? 0;
        const pageSize = params.pageSize ?? 10;
        const paginatedData = filteredItems.slice(page * pageSize, (page + 1) * pageSize);
        return { data: paginatedData, totalCount };
    } else {
        // TODO (Backend): GET /api/schedules
        // Ensure backend returns Schedule[] with resolved names for course, teacher, classroom, section times.
        // Params: page, pageSize, sort, filterCourseId, filterTeacherId, filterClassroomId, filterSemesterId
        const response = await axiosInstance.get<ApiListResponse<Schedule>>('admin/schedules', { params });
        return response.data;
    }
};

const createSchedule = async (payload: SchedulePayload): Promise<Schedule> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminScheduleApi.createSchedule with payload:", payload);
        await new Promise(res => setTimeout(res, 350 + Math.random() * 200));
        // Basic conflict check for mock: same classroom, weekday, section, overlapping weeks
        const conflict = mockSchedulesDb.some(s =>
            s.classroomId === payload.classroomId &&
            s.weekDay === payload.weekDay &&
            s.sectionId === payload.sectionId &&
            // Very simplistic week overlap check for mock
            (s.weeks.split(',').some(sw => payload.weeks.includes(sw)) ||
                payload.weeks.split(',').some(pw => s.weeks.includes(pw)))
        );
        if (conflict) {
            throw { response: { data: { message: '时间或教室冲突 (模拟)' } } };
        }

        // Resolve names for mock display
        const course = MOCK_COURSES_SHORT.find(c => c.courseId === payload.courseId);
        const teacher = MOCK_TEACHERS_LIST.find(t => t.teacherId === payload.teacherId);
        const classroom = MOCK_CLASSROOMS_SHORT.find(c => c.classroomId === payload.classroomId);
        const section = MOCK_SECTIONS_LIST.find(sec => sec.sectionId === payload.sectionId);

        const newSchedule: Schedule = {
            ...payload,
            scheduleId: nextScheduleDbId++,
            courseName: course?.courseName,
            courseCode: course?.courseCode,
            teacherName: teacher?.name,
            building: classroom?.building,
            roomNumber: classroom?.roomNumber,
            startTime: section?.startTime,
            endTime: section?.endTime,
        };
        mockSchedulesDb.push(newSchedule);
        return newSchedule;
    } else {
        // TODO (Backend): POST /api/schedules
        // Backend must perform robust conflict checking.
        // Backend should return the created Schedule object WITH resolved names.
        const response = await axiosInstance.post<Schedule>('admin/schedules', payload);
        return response.data;
    }
};

const updateSchedule = async (id: number, payload: Partial<SchedulePayload>): Promise<Schedule> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminScheduleApi.updateSchedule ${id} with payload:`, payload);
        await new Promise(res => setTimeout(res, 350 + Math.random() * 200));
        const index = mockSchedulesDb.findIndex(s => s.scheduleId === id);
        if (index === -1) throw { response: { data: { message: "排课记录未找到 (模拟)" } } };

        // Basic conflict check (excluding self)
        if (payload.classroomId || payload.weekDay || payload.sectionId || payload.weeks) {
            const conflict = mockSchedulesDb.some(s =>
                s.scheduleId !== id && // Exclude self
                s.classroomId === (payload.classroomId ?? mockSchedulesDb[index].classroomId) &&
                s.weekDay === (payload.weekDay ?? mockSchedulesDb[index].weekDay) &&
                s.sectionId === (payload.sectionId ?? mockSchedulesDb[index].sectionId) &&
                ((payload.weeks ?? mockSchedulesDb[index].weeks).split(',').some(sw => (mockSchedulesDb[index].weeks).includes(sw)) ||
                    (mockSchedulesDb[index].weeks).split(',').some(pw => (payload.weeks ?? mockSchedulesDb[index].weeks).includes(pw)))
            );
            if (conflict) throw { response: { data: { message: '更新后时间或教室冲突 (模拟)' } } };
        }

        mockSchedulesDb[index] = { ...mockSchedulesDb[index], ...payload, scheduleId: id };
        // Re-resolve names if IDs changed
        const updatedSched = mockSchedulesDb[index];
        if (payload.courseId) { const c = MOCK_COURSES_SHORT.find(co => co.courseId === payload.courseId); updatedSched.courseName = c?.courseName; updatedSched.courseCode = c?.courseCode; }
        if (payload.teacherId) { updatedSched.teacherName = MOCK_TEACHERS_LIST.find(t => t.teacherId === payload.teacherId)?.name; }
        if (payload.classroomId) { const cl = MOCK_CLASSROOMS_SHORT.find(cr => cr.classroomId === payload.classroomId); updatedSched.building = cl?.building; updatedSched.roomNumber = cl?.roomNumber; }
        if (payload.sectionId) { const se = MOCK_SECTIONS_LIST.find(sc => sc.sectionId === payload.sectionId); updatedSched.startTime = se?.startTime; updatedSched.endTime = se?.endTime; }

        return updatedSched;
    } else {
        // TODO (Backend): PUT /api/schedules/{id}
        const response = await axiosInstance.put<Schedule>(`admin/schedules/${id}`, payload);
        return response.data;
    }
};

const deleteSchedule = async (id: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminScheduleApi.deleteSchedule ${id}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 100));
        const initialLength = mockSchedulesDb.length;
        mockSchedulesDb = mockSchedulesDb.filter(s => s.scheduleId !== id);
        if (mockSchedulesDb.length === initialLength) throw { response: { data: { message: "排课记录未找到 (模拟)" } } };
        return;
    } else {
        // TODO (Backend): DELETE /api/schedules/{id}
        // Consider implications: delete related enrollments? or prevent delete if enrollments exist?
        await axiosInstance.delete(`admin/schedules/${id}`);
    }
};

export const adminScheduleApi = {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
};