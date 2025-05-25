// src/features/assignments/AssignmentPage.tsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Snackbar, Box } from '@mui/material';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import AssignmentForm from './components/AssignmentForm';
import { fetchTeacherCoursesForAssignments, postAssignmentNotification, resetAssignmentFormStatus, setAssignmentSemesterId } from './store/assignmentSlice'; // Use correct action names
import type { AssignmentPayload } from '../../types';

const AssignmentPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        teacherCourses,
        isLoadingCourses,
        isSubmitting,
        submitSuccess,
        error,
        currentSemesterIdForCourses,
        hasLoadedTeacherCourses, // <-- Add this
    } = useSelector((state: RootState) => state.assignments); // Slice key is 'assignments'

    const { currentSemester: timetableCurrentSemester } = useSelector((state: RootState) => state.timetable);

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // Set semester ID for fetching courses
    useEffect(() => {
        if (timetableCurrentSemester && timetableCurrentSemester.semesterId !== currentSemesterIdForCourses) {
            dispatch(setAssignmentSemesterId(timetableCurrentSemester.semesterId));
        }
    }, [dispatch, timetableCurrentSemester, currentSemesterIdForCourses]);

    // Fetch teacher's courses for the current semester
    useEffect(() => {
        // Use hasLoadedTeacherCourses in the condition
        if (currentSemesterIdForCourses && !hasLoadedTeacherCourses && !isLoadingCourses) {
            dispatch(fetchTeacherCoursesForAssignments(currentSemesterIdForCourses));
        }
    }, [dispatch, currentSemesterIdForCourses, hasLoadedTeacherCourses, isLoadingCourses]);

    // Handle submission feedback with Snackbar
    useEffect(() => {
        if (submitSuccess) {
            setSnackbarMessage("作业通知已成功发布！");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            dispatch(resetAssignmentFormStatus()); // Reset form status in slice
        } else if (error && !isSubmitting) { // Show error only if not actively submitting
            setSnackbarMessage(`发布失败: ${error}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            // dispatch(resetAssignmentFormStatus()); // Optionally clear error after showing
        }
    }, [submitSuccess, error, isSubmitting, dispatch]);

    const handleSubmitAssignment = async (data: AssignmentPayload) => {
        // Thunk's unwrap() will propagate error to be caught by useEffect or directly here
        await dispatch(postAssignmentNotification(data)).unwrap();
    };

    const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
        if (error || submitSuccess) dispatch(resetAssignmentFormStatus()); // Reset status when snackbar closes
    };

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                发布作业/通知 {timetableCurrentSemester ? `(${timetableCurrentSemester.semesterName})` : ''}
            </Typography>

            {(isLoadingCourses && !hasLoadedTeacherCourses) && ( // Show loading only if not loaded yet
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载授课列表...</Typography>
                </Box>
            )}

            {(!isLoadingCourses && !timetableCurrentSemester && hasLoadedTeacherCourses) && ( // Check hasLoadedTeacherCourses before showing warning
                <Alert severity="warning" sx={{ mt: 2 }}>请等待学期信息加载以选择目标课程。</Alert>
            )}

            {/* Render form when not loading courses AND semester info is available AND courses have been loaded/attempted */}
            {hasLoadedTeacherCourses && !isLoadingCourses && timetableCurrentSemester && (
                <AssignmentForm
                    teacherCoursesForDropdown={teacherCourses}
                    onSubmitAssignment={handleSubmitAssignment}
                    isSubmitting={isSubmitting}
                    isLoadingCourses={isLoadingCourses}
                />
            )}

            <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default AssignmentPage;