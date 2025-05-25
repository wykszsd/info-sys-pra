// src/features/teacher/MyCoursesPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Box } from '@mui/material';
import type { AppDispatch, RootState } from '../../store';
import { fetchTeacherSchedulesForRequests } from '../requests/store/requestSlice';
import TaughtCourseList from './components/TaughtCourseList';

const MyCoursesPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        teacherSchedules,
        isLoadingSchedules,
        error: requestError,
    } = useSelector((state: RootState) => state.requests);

    const { currentSemester, isLoadingInitialData: isLoadingTimetableData, error: timetableError } = useSelector((state: RootState) => state.timetable);

    // Log states for debugging
    useEffect(() => {
        console.log('[MyCoursesPage] Effect triggered. Current states:');
        console.log('  - currentSemester:', currentSemester);
        console.log('  - teacherSchedules count:', teacherSchedules.length);
        console.log('  - isLoadingSchedules:', isLoadingSchedules);
        console.log('  - isLoadingTimetableData (for semester):', isLoadingTimetableData);
    }, [currentSemester, teacherSchedules.length, isLoadingSchedules, isLoadingTimetableData]);

    useEffect(() => {
        // Only fetch if currentSemester is loaded, and schedules haven't been fetched yet or failed previously
        if (currentSemester && currentSemester.semesterId) {
            // Fetch if schedules are empty AND not currently loading them
            // OR if there was a previous error fetching schedules (requestError)
            if ((teacherSchedules.length === 0 && !isLoadingSchedules) || requestError) {
                console.log(`[MyCoursesPage] Dispatching fetchTeacherSchedulesForRequests for semesterId: ${currentSemester.semesterId}`);
                dispatch(fetchTeacherSchedulesForRequests(currentSemester.semesterId));
            }
        } else if (!isLoadingTimetableData) {
            // This case means timetable data (which includes semester) is not loading, but currentSemester is still null
            // This could happen if timetable initialization failed or hasn't run.
            console.warn('[MyCoursesPage] currentSemester is null and timetable is not loading. Cannot fetch teacher schedules.');
        }
    }, [dispatch, currentSemester, teacherSchedules.length, isLoadingSchedules, requestError]);


    const pageError = requestError || (currentSemester ? null : timetableError); // Combine errors

    // Loading state:
    // 1. If timetable data (which provides semester) is loading
    // 2. Or, if semester is loaded, but teacher schedules are loading
    const overallIsLoading = isLoadingTimetableData || (currentSemester && isLoadingSchedules);

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                我的教学安排 {currentSemester ? `(${currentSemester.semesterName})` : ''}
            </Typography>

            {overallIsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>
                        {isLoadingTimetableData ? '加载学期信息中...' : '加载教学安排中...'}
                    </Typography>
                </Box>
            )}

            {pageError && !overallIsLoading && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    加载教学安排失败: {pageError}
                    {timetableError && currentSemester && " (学期信息可能也存在问题)"}
                </Alert>
            )}

            {!overallIsLoading && !pageError && currentSemester && (
                teacherSchedules.length > 0 ? (
                    <TaughtCourseList schedules={teacherSchedules} />
                ) : (
                    <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
                        本学期您暂无教学安排。
                    </Typography>
                )
            )}

            {!currentSemester && !overallIsLoading && !pageError && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
                    学期信息加载中或加载失败，无法显示教学安排。
                </Typography>
            )}
        </Paper>
    );
};

export default MyCoursesPage;