// src/features/courses/CourseSelectionPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper, Snackbar, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { AppDispatch, RootState } from '../../store';
import {
    fetchAllSelectableCourses,
    fetchStudentEnrollments,
    enrollStudentInCourse,
    withdrawStudentFromCourse,
    setCurrentCourseSemesterId,
    clearCourseSelectionError,
} from './store/courseSelectionSlice';
import AvailableCourseList from './components/AvailableCourseList';
import type { EnrollmentRecord } from '../../types';

const CourseSelectionPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        selectableCourses,
        myEnrollments,
        isLoading,
        isEnrolling,
        error,
        currentSemesterId,
        hasLoadedSelectableCourses, // 新增
        hasLoadedEnrollments,       // 新增
    } = useSelector((state: RootState) => state.courses);
    const { currentSemester: timetableCurrentSemester } = useSelector((state: RootState) => state.timetable);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (timetableCurrentSemester && timetableCurrentSemester.semesterId !== currentSemesterId) {
            dispatch(setCurrentCourseSemesterId(timetableCurrentSemester.semesterId));
        }
    }, [dispatch, timetableCurrentSemester, currentSemesterId]);

    useEffect(() => {
        if (currentSemesterId) {
            if (!hasLoadedSelectableCourses && !isLoading) { // 使用 hasLoadedSelectableCourses
                dispatch(fetchAllSelectableCourses(currentSemesterId));
            }
            if (!hasLoadedEnrollments && !isLoading) {    // 使用 hasLoadedEnrollments
                dispatch(fetchStudentEnrollments(currentSemesterId));
            }
        } else if (!timetableCurrentSemester && !isLoading) {
            console.warn("CourseSelectionPage: Current semester info is not available to fetch courses.");
        }
    }, [dispatch, currentSemesterId, hasLoadedSelectableCourses, hasLoadedEnrollments, isLoading]);


    const handleEnroll = async (scheduleId: number) => {
        try {
            const result = await dispatch(enrollStudentInCourse(scheduleId)).unwrap();
            setSnackbarMessage(result.message || "选课成功！");
            setSnackbarSeverity('success');
        } catch (rejectedValue: any) {
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
        if (error && snackbarSeverity === 'error') dispatch(clearCourseSelectionError());
    };

    const enrollmentsMap = useMemo(() => {
        const map = new Map<number, EnrollmentRecord>();
        myEnrollments.forEach(e => {
            if (e.status === 'enrolled' && e.scheduleId) {
                map.set(e.scheduleId, e);
            }
        });
        return map;
    }, [myEnrollments]);

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
        // Show main loading indicator if essential data for the page hasn't been attempted yet AND isLoading
        const initialDataLoading = isLoading && (!hasLoadedSelectableCourses || !hasLoadedEnrollments);

        if (!currentSemesterId && !timetableCurrentSemester && !isLoading) { // Added !isLoading to ensure not showing during initial timetable load
            return <Alert severity="warning" sx={{ mt: 2 }}>无法获取当前学期信息，选课功能暂不可用。</Alert>;
        }
        if (initialDataLoading) {
            return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /><Typography sx={{ ml: 2 }}>加载课程数据中...</Typography></Box>;
        }
        // If still loading but it's not the initial load (e.g. during enroll/withdraw), we don't show the main loader here,
        // individual components might show their own loading state (e.g. CourseRow processing action).

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
                {error && !isEnrolling.size && !snackbarOpen && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}
                {(hasLoadedSelectableCourses || selectableCourses.length > 0) && (hasLoadedEnrollments || myEnrollments.length > 0) && ( // Render list only if data has been loaded/attempted or is present
                    <AvailableCourseList
                        courses={filteredCourses}
                        enrollmentsMap={enrollmentsMap}
                        onEnroll={handleEnroll}
                        onWithdraw={handleWithdraw}
                        processingActions={isEnrolling}
                    />
                )}
                {/* Message for truly empty state after load attempts */}
                {hasLoadedSelectableCourses && selectableCourses.length === 0 && !isLoading && (
                    <Alert severity="info" sx={{ mt: 2 }}>当前学期没有可选课程。</Alert>
                )}
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