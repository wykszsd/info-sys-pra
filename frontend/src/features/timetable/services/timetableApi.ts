// src/features/timetable/services/timetableApi.ts
import axiosInstance from '../../../services/axiosInstance';
import type { SemesterInfo, ClassSection, Schedule } from '../../../types';

// Mock Data Imports
import MOCK_SEMESTER from './mockData/currentSemester.json';
import MOCK_SECTIONS from './mockData/sections.json';
import MOCK_SCHEDULE_W1 from './mockData/schedule_week_1.json';
import MOCK_SCHEDULE_W2 from './mockData/schedule_week_2.json'; // Add more mock weeks if needed

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const getCurrentSemester = async (): Promise<SemesterInfo> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: timetableApi.getCurrentSemester called");
        await new Promise(res => setTimeout(res, 200 + Math.random() * 300));

        return MOCK_SEMESTER as SemesterInfo;
    } else {
        // TODO (Backend): GET /api/semesters/current
        const response = await axiosInstance.get('/semesters/current');
        return response.data;
    }
};

const getAllClassSections = async (): Promise<ClassSection[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: timetableApi.getAllClassSections called");
        await new Promise(res => setTimeout(res, 150 + Math.random() * 200));
        return MOCK_SECTIONS as ClassSection[];
    } else {
        // TODO (Backend): GET /api/class-sections
        // This endpoint should return all predefined class sections for the campus/system
        const response = await axiosInstance.get('/class-sections');
        return response.data;
    }
};

const getMyTimetable = async (semesterId: number, week: number): Promise<Schedule[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: timetableApi.getMyTimetable for semester ${semesterId}, week ${week}`);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 400));
        if (week === 1) {
            console.log("Returning MOCK_SCHEDULE_W1:", MOCK_SCHEDULE_W1); // 添加日志
            return MOCK_SCHEDULE_W1 as Schedule[];
        }
        if (week === 2) return MOCK_SCHEDULE_W2 as Schedule[];
        // Return empty or different mock data for other weeks
        return [];
    } else {
        // TODO (Backend): GET /api/timetable/my?semesterId={semesterId}&week={week}
        // Backend should filter by logged-in user's role (student enrollments or teacher assignments)
        // And return Schedule objects with resolved names (courseName, teacherName, building, roomNumber, startTime, endTime)
        const response = await axiosInstance.get(`/timetable/my`, { params: { semesterId, week } });
        console.log(response.data);
        return response.data;
    }
};

export const timetableApi = {
    getCurrentSemester,
    getAllClassSections,
    getMyTimetable,
};