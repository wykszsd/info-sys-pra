// src/features/teacher/MyCoursesPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Box } from '@mui/material';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import { fetchTeacherSchedulesForRequests } from '../requests/store/requestSlice'; // <<< 修正后的 Thunk 名称 // Assuming schedules are fetched here for request forms
import TaughtCourseList from './components/TaughtCourseList';

const MyCoursesPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        teacherSchedules, // Schedules taught by this teacher
        isLoadingSchedules,
        error: requestError, // Error related to fetching schedules for request purposes
    } = useSelector((state: RootState) => state.requests); // Assuming requests slice holds teacher's own schedules

    const { currentSemester } = useSelector((state: RootState) => state.timetable);

    useEffect(() => {
        if (currentSemester && teacherSchedules.length === 0 && !isLoadingSchedules) {
            dispatch(fetchTeacherSchedulesForRequests(currentSemester.semesterId)); // <<< 使用正确的 Thunk
        }
    }, [dispatch, currentSemester, teacherSchedules.length, isLoadingSchedules]);

    const pageError = requestError; // Use error from requests slice for now

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                我的教学安排 {currentSemester ? `(${currentSemester.semesterName})` : ''}
            </Typography>

            {isLoadingSchedules && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载教学安排中...</Typography>
                </Box>
            )}
            {pageError && !isLoadingSchedules && (
                <Alert severity="error" sx={{ mt: 2 }}>加载教学安排失败: {pageError}</Alert>
            )}

            {!isLoadingSchedules && !pageError && currentSemester && (
                <TaughtCourseList schedules={teacherSchedules} />
            )}
            {!isLoadingSchedules && !pageError && teacherSchedules.length === 0 && currentSemester && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>本学期您暂无教学安排。</Typography>
            )}
            {!currentSemester && !isLoadingSchedules && !pageError && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>请等待学期信息加载...</Typography>
            )}
        </Paper>
    );
};

export default MyCoursesPage;