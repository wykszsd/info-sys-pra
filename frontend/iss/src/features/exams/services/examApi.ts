// src/features/exams/services/examApi.ts
import axiosInstance from '../../../services/axiosInstance'; // Adjust path
import type { ExamArrangement } from '../../../types'; // Adjust path
// Adjust path
import MOCK_MY_EXAMS_DATA from './mockData/myExams.json'; // Adjust path

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const getMyExamArrangements = async (semesterId: number): Promise<ExamArrangement[]> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: examApi.getMyExamArrangements for semester ${semesterId}`);
        await new Promise(res => setTimeout(res, 350 + Math.random() * 200));
        // Mock should ideally filter by semesterId if mock data contains multiple semesters
        // For now, it returns all mock exams.
        return MOCK_MY_EXAMS_DATA as ExamArrangement[];
    } else {
        // TODO (Backend): GET /api/exams/my?semesterId={semesterId}
        // Backend filters by logged-in user (student or teacher based on invigilation)
        // And returns ExamArrangement[] with resolved names/locations
        const response = await axiosInstance.get(`/exams/my`, { params: { semesterId } });
        return response.data;
    }
};

export const examApi = {
    getMyExamArrangements,
};