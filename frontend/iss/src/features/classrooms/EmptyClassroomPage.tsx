// src/features/classrooms/EmptyClassroomPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import ClassroomSearchForm from './components/ClassroomSearchForm';
import ClassroomResultList from './components/ClassroomResultList';
import { fetchBuildingNamesList } from './store/classroomSlice'; // Use correct action name
import { fetchAllTimetableSections } from '../timetable/store/timetableSlice'; // To get sections for the form

const EmptyClassroomPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        availableClassrooms,
        buildings,
        isLoading: isLoadingClassrooms, // Loading state from classroomSlice
        error: classroomError,
        query: currentSearchQuery
    } = useSelector((state: RootState) => state.classrooms);

    const {
        allSections: timetableSections,
        isLoading: isLoadingTimetable, // Loading state from timetableSlice
        error: timetableError
    } = useSelector((state: RootState) => state.timetable);

    // Fetch initial data for form dropdowns
    useEffect(() => {
        if (buildings.length === 0 && !isLoadingClassrooms) { // isLoadingClassrooms to prevent multiple calls
            dispatch(fetchBuildingNamesList());
        }
        if (timetableSections.length === 0 && !isLoadingTimetable) {
            dispatch(fetchAllTimetableSections());
        }
    }, [dispatch, buildings.length, timetableSections.length, isLoadingClassrooms, isLoadingTimetable]);


    // Determine overall loading/error state for the page
    const pageIsLoading = isLoadingClassrooms || (timetableSections.length === 0 && isLoadingTimetable) || (buildings.length === 0 && isLoadingClassrooms);
    const pageError = classroomError || (timetableSections.length === 0 && !isLoadingTimetable ? timetableError || "无法加载节次数据" : null) || (buildings.length === 0 && !isLoadingClassrooms ? "无法加载教学楼数据" : null);
    const formReady = timetableSections.length > 0 && buildings.length > 0;


    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                空教室查询
            </Typography>

            {!formReady && pageIsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载查询选项...</Typography>
                </Box>
            )}
            {!formReady && !pageIsLoading && pageError && (
                <Alert severity="warning" sx={{ mt: 2 }}>无法加载查询表单所需数据: {pageError}</Alert>
            )}

            {formReady && (
                <ClassroomSearchForm
                    buildings={buildings}
                    allTimetableSections={timetableSections}
                    isLoadingSearch={isLoadingClassrooms} // Pass the specific search loading state
                />
            )}

            {/* Display Loading Indicator specifically for search results */}
            {isLoadingClassrooms && currentSearchQuery.startDate && ( // Show only if a search is active
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>正在查询空教室...</Typography>
                </Box>
            )}

            {/* Display Error Messages (classroomError takes precedence if search was made) */}
            {classroomError && !isLoadingClassrooms && (
                <Alert severity={classroomError.startsWith("没有找到") ? "info" : "error"} sx={{ mt: 2 }}>
                    {classroomError}
                </Alert>
            )}

            {/* Display Results */}
            {!isLoadingClassrooms && !classroomError && availableClassrooms.length > 0 && (
                <ClassroomResultList results={availableClassrooms} />
            )}
            {/* Message if no results and no error, only after a search was attempted */}
            {!isLoadingClassrooms && !classroomError && availableClassrooms.length === 0 && currentSearchQuery.startDate && (
                <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    没有找到符合当前查询条件的空教室。
                </Typography>
            )}
            {!isLoadingClassrooms && !classroomError && availableClassrooms.length === 0 && !currentSearchQuery.startDate && (
                <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    请选择查询条件开始搜索。
                </Typography>
            )}
        </Paper>
    );
};

export default EmptyClassroomPage;