// src/features/courses/CourseSelectionPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper, Snackbar, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import {
    fetchAllSelectableCourses,
    fetchStudentEnrollments,
    enrollStudentInCourse,
    withdrawStudentFromCourse,
    setCurrentCourseSemesterId,
    clearCourseSelectionError,
} from './store/courseSelectionSlice'; // Use correct action names
import AvailableCourseList from './components/AvailableCourseList';
import type { EnrollmentRecord } from '../../types';

const CourseSelectionPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        selectableCourses,
        myEnrollments,
        isLoading,
        isEnrolling, // This is a Set of scheduleIds
        error,
        currentSemesterId,
    } = useSelector((state: RootState) => state.courses); // Slice key is 'courses'
    const { currentSemester: timetableCurrentSemester } = useSelector((state: RootState) => state.timetable);

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');
    // Filter state
    const [searchTerm, setSearchTerm] = useState('');


    // Set current semester ID from timetable slice when it loads
    useEffect(() => {
        if (timetableCurrentSemester && timetableCurrentSemester.semesterId !== currentSemesterId) {
            dispatch(setCurrentCourseSemesterId(timetableCurrentSemester.semesterId));
        }
    }, [dispatch, timetableCurrentSemester, currentSemesterId]);

    // Fetch selectable courses and my enrollments when semester ID is set
    useEffect(() => {
        if (currentSemesterId) {
            // Only fetch if data is not already present or not loading
            // This simple check can be improved if stale data is a concern
            if (selectableCourses.length === 0 && !isLoading) {
                dispatch(fetchAllSelectableCourses(currentSemesterId));
            }
            if (myEnrollments.length === 0 && !isLoading) {
                dispatch(fetchStudentEnrollments(currentSemesterId));
            }
        } else if (!timetableCurrentSemester && !isLoading) { // If timetable semester also not loaded
            // This might indicate an issue if this page is accessible without semester info
            console.warn("CourseSelectionPage: Current semester info is not available to fetch courses.");
        }
    }, [dispatch, currentSemesterId, selectableCourses.length, myEnrollments.length, isLoading]);


    const handleEnroll = async (scheduleId: number) => {
        try {
            const result = await dispatch(enrollStudentInCourse(scheduleId)).unwrap();
            setSnackbarMessage(result.message || "选课成功！");
            setSnackbarSeverity('success');
        } catch (rejectedValue: any) { // Error is the rejectedValue itself
            setSnackbarMessage(`选课失败: ${rejectedValue || '未知错误'}`);
            setSnackbarSeverity('error');
        } finally {
            setSnackbarOpen(true);
        }
    };

    const handleWithdraw = async (enrollmentId: number, scheduleId: number) => {
        try {
            const result = await dispatch(withdrawStudentFromCourse({ enrollmentId, scheduleId })).unwrap();
            setSnackbarMessage(result.message || "退课成功！");
            setSnackbarSeverity('success');
        } catch (rejectedValue: any) {
            setSnackbarMessage(`退课失败: ${rejectedValue || '未知错误'}`);
            setSnackbarSeverity('error');
        } finally {
            setSnackbarOpen(true);
        }
    };

    const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
        if (error && snackbarSeverity === 'error') dispatch(clearCourseSelectionError()); // Clear error after showing
    };

    // Memoized enrollment map for quick lookup
    const enrollmentsMap = useMemo(() => {
        const map = new Map<number, EnrollmentRecord>();
        myEnrollments.forEach(e => {
            if (e.status === 'enrolled' && e.scheduleId) {
                map.set(e.scheduleId, e);
            }
        });
        return map;
    }, [myEnrollments]);

    // Filtered courses based on search term (client-side filtering)
    const filteredCourses = useMemo(() => {
        if (!searchTerm) return selectableCourses;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return selectableCourses.filter(course =>
            course.courseName?.toLowerCase().includes(lowerSearchTerm) ||
            course.courseCode?.toLowerCase().includes(lowerSearchTerm) ||
            course.teacherName?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [selectableCourses, searchTerm]);


    const renderContent = () => {
        if (!currentSemesterId && !timetableCurrentSemester && isLoading) {
            return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
        }
        if (!currentSemesterId && !timetableCurrentSemester) {
            return <Alert severity="warning" sx={{ mt: 2 }}>无法获取当前学期信息，选课功能暂不可用。</Alert>;
        }
        // Show general loading for initial data fetch
        if (isLoading && selectableCourses.length === 0 && myEnrollments.length === 0) {
            return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /><Typography sx={{ ml: 2 }}>加载课程数据中...</Typography></Box>;
        }

        return (
            <>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="搜索课程名称、代码或教师..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ my: 2 }}
                    InputProps={{
                        startAdornment: (<InputAdornment position="start"> <SearchIcon /> </InputAdornment>),
                    }}
                />
                {/* Display general error from slice if it's not related to a specific enroll/withdraw action that has its own snackbar */}
                {error && !isEnrolling.size && !snackbarOpen && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}
                <AvailableCourseList
                    courses={filteredCourses}
                    enrollmentsMap={enrollmentsMap}
                    onEnroll={handleEnroll}
                    onWithdraw={handleWithdraw}
                    processingActions={isEnrolling}
                />
            </>
        );
    };


    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                选课中心 {timetableCurrentSemester ? `(${timetableCurrentSemester.semesterName})` : ''}
            </Typography>
            {renderContent()}
            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default CourseSelectionPage;