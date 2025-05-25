// src/features/classrooms/services/classroomApi.ts
import axiosInstance from '../../../services/axiosInstance';
import type { EmptyClassroomQuery, AvailableClassroom } from '../../../types'; // Adjust path
// Adjust path

// Mock Data Imports
import MOCK_BUILDINGS_DATA from './mockData/buildings.json'; // Adjust path
import MOCK_EMPTY_CLASSROOMS_DATA from './mockData/emptyClassrooms.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const getBuildingNames = async (): Promise<string[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: classroomApi.getBuildingNames called");
        await new Promise(res => setTimeout(res, 100 + Math.random() * 100));
        return MOCK_BUILDINGS_DATA as string[];
    } else {
        // TODO (Backend): GET /api/classrooms/distinct-buildings (or similar)
        const response = await axiosInstance.get('/classrooms/distinct-buildings');
        return response.data; // Expects string[]
    }
};

const findEmptyClassrooms = async (query: EmptyClassroomQuery): Promise<AvailableClassroom[]> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: classroomApi.findEmptyClassrooms called with query:", query);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 300));
        let results = MOCK_EMPTY_CLASSROOMS_DATA as AvailableClassroom[];
        if (query.building) {
            results = results.filter(c => c.building === query.building);
        }
        if (query.minCapacity) {
            results = results.filter(c => c.capacity >= query.minCapacity!);
        }
        // Mock doesn't filter by date/section in this simple version.
        // Real backend MUST filter by date range and sections, excluding occupied ones from schedules/exams.
        return results;
    } else {
        // TODO (Backend): GET /api/classrooms/empty
        // Params: startDate, endDate, sections (comma-separated string), building?, minCapacity?
        // Backend needs to perform complex query against classrooms, schedules, and exams tables.
        const response = await axiosInstance.get('/classrooms/empty', {
            params: {
                ...query,
                sections: query.sectionIds.join(','), // Convert array to comma-separated string for query
            }
        });
        return response.data; // Expects AvailableClassroom[]
    }
};

export const classroomApi = {
    getBuildingNames,
    findEmptyClassrooms,
};