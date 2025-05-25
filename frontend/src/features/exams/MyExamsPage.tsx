// src/features/exams/MyExamsPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Box } from '@mui/material';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import { fetchStudentExams, setCurrentExamSemesterId } from './store/examSlice'; // Use correct action names
import ExamList from './components/ExamList';

const MyExamsPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        myExams,
        isLoading,
        error,
        currentSemesterId: examCurrentSemesterId, // Renamed to avoid conflict with timetable's
        hasLoadedMyExams, // <-- Add this
    } = useSelector((state: RootState) => state.exams);
    const { currentSemester: timetableCurrentSemester } = useSelector((state: RootState) => state.timetable);

    // Set current semester ID from timetable slice when it loads or changes
    useEffect(() => {
        if (timetableCurrentSemester && timetableCurrentSemester.semesterId !== examCurrentSemesterId) {
            dispatch(setCurrentExamSemesterId(timetableCurrentSemester.semesterId));
        }
    }, [dispatch, timetableCurrentSemester, examCurrentSemesterId]);

    // Fetch exams when semester ID is set
    useEffect(() => {
        if (examCurrentSemesterId && !hasLoadedMyExams && !isLoading) { // Use hasLoadedMyExams
            dispatch(fetchStudentExams(examCurrentSemesterId));
        } else if (!timetableCurrentSemester && !isLoading && !examCurrentSemesterId) { // Added !examCurrentSemesterId
            console.warn("MyExamsPage: Current semester info not available to fetch exams.");
        }
    }, [dispatch, examCurrentSemesterId, hasLoadedMyExams, isLoading, timetableCurrentSemester]);

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                我的考试安排 {timetableCurrentSemester ? `(${timetableCurrentSemester.semesterName})` : ''}
            </Typography>

            {isLoading && !hasLoadedMyExams && ( // Show loading only if not loaded yet
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载考试安排中...</Typography>
                </Box>
            )}
            {error && !isLoading && <Alert severity="error" sx={{ mt: 2 }}>加载考试安排失败: {error}</Alert>}

            {hasLoadedMyExams && !isLoading && !error && ( // Render if loaded or attempted
                <ExamList exams={myExams} />
            )}
            {/* Message for empty list after successful load */}
            {hasLoadedMyExams && !isLoading && !error && myExams.length === 0 && timetableCurrentSemester && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>本学期暂无考试安排。</Typography>
            )}
            {!timetableCurrentSemester && !isLoading && !error && !examCurrentSemesterId && ( // Added !examCurrentSemesterId
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>请等待学期信息加载...</Typography>
            )}
        </Paper>
    );
};

export default MyExamsPage;