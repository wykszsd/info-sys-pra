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
        isLoading: isLoadingClassroomsData, // Renamed to be more specific
        error: classroomError,
        query: currentSearchQuery,
        hasLoadedBuildings, // <-- Add this
    } = useSelector((state: RootState) => state.classrooms);

    const {
        allSections: timetableSections,
        isLoadingSections: isLoadingTimetableSections, // Use specific loading state
        error: timetableError,
        hasLoadedAllSections, // <-- Add this
    } = useSelector((state: RootState) => state.timetable);

    // Fetch initial data for form dropdowns
    useEffect(() => {
        // Use hasLoaded flags in conditions
        if (!hasLoadedBuildings && !isLoadingClassroomsData) {
            dispatch(fetchBuildingNamesList());
        }
        if (!hasLoadedAllSections && !isLoadingTimetableSections) {
            dispatch(fetchAllTimetableSections());
        }
    }, [dispatch, hasLoadedBuildings, isLoadingClassroomsData, hasLoadedAllSections, isLoadingTimetableSections]);


    // Determine overall loading/error state for the page
    // Show loading if any of the essential form data is still loading AND hasn't been loaded before
    const formPrerequisitesLoading =
        (!hasLoadedBuildings && isLoadingClassroomsData) ||
        (!hasLoadedAllSections && isLoadingTimetableSections);

    const pageError = classroomError || (!hasLoadedAllSections && !isLoadingTimetableSections && timetableError ? `节次数据: ${timetableError}` : null);
    const formReady = hasLoadedBuildings && hasLoadedAllSections;


    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                空教室查询
            </Typography>

            {formPrerequisitesLoading && ( // Show loading for form prerequisites
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载查询选项...</Typography>
                </Box>
            )}
            {!formPrerequisitesLoading && !formReady && pageError && ( // Show error if form prerequisites failed to load
                <Alert severity="warning" sx={{ mt: 2 }}>无法加载查询表单所需数据: {pageError}</Alert>
            )}

            {formReady && ( // Render form only when prerequisites are loaded
                <ClassroomSearchForm
                    buildings={buildings}
                    allTimetableSections={timetableSections}
                    isLoadingSearch={isLoadingClassroomsData} // Pass the specific search loading state
                />
            )}

            {/* Display Loading Indicator specifically for search results when a search is active */}
            {isLoadingClassroomsData && currentSearchQuery.startDate && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>正在查询空教室...</Typography>
                </Box>
            )}

            {/* Display Error Messages related to the search itself */}
            {classroomError && !isLoadingClassroomsData && currentSearchQuery.startDate && (
                <Alert severity={classroomError.startsWith("没有找到") ? "info" : "error"} sx={{ mt: 2 }}>
                    {classroomError}
                </Alert>
            )}

            {/* Display Results */}
            {!isLoadingClassroomsData && !classroomError && availableClassrooms.length > 0 && (
                <ClassroomResultList results={availableClassrooms} />
            )}
            {/* Message if no results and no error, only after a search was attempted */}
            {!isLoadingClassroomsData && !classroomError && availableClassrooms.length === 0 && currentSearchQuery.startDate && (
                <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    没有找到符合当前查询条件的空教室。
                </Typography>
            )}
            {/* Initial message before any search */}
            {!currentSearchQuery.startDate && !isLoadingClassroomsData && availableClassrooms.length === 0 && (
                <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    请选择查询条件开始搜索。
                </Typography>
            )}
        </Paper>
    );
};

export default EmptyClassroomPage;