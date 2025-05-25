// src/features/requests/SubmitRequestPage.tsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper, Tabs, Tab, Snackbar } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import ScheduleChangeRequestForm from './components/ScheduleChangeRequestForm';
import ExamRequestForm from './components/ExamRequestForm';
import { fetchTeacherSchedulesForRequests, resetRequestSubmitStatus, submitScheduleChangeApp, submitExamArrangementApp, setRequestSemesterId } from './store/requestSlice'; // Adjust path
import { fetchAllTimetableSections } from '../timetable/store/timetableSlice'; // Adjust path
import { fetchAllClassroomsShortList } from '../../store/sharedDataSlice'; // Adjust path
import type { ScheduleChangeRequestPayload, ExamRequestPayload } from '../../types';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`request-tabpanel-${index}`} aria-labelledby={`request-tab-${index}`} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const SubmitRequestPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [activeTab, setActiveTab] = useState(0);

    const {
        teacherSchedules, isLoadingSchedules,
        isSubmittingChange, isSubmittingExam, submitSuccess, error,
        currentSemesterIdForSchedules,
        hasLoadedTeacherSchedules, // <-- Add this
    } = useSelector((state: RootState) => state.requests);

    const {
        currentSemester: timetableCurrentSemester,
        allSections,
        isLoadingSections: isLoadingTimetableSections,
        hasLoadedAllSections, // <-- Add this
    } = useSelector((state: RootState) => state.timetable);

    const {
        allClassroomsShort,
        isLoading: isLoadingSharedData, // isLoading is an object
        hasLoadedClassroomsShort, // <-- Add this
    } = useSelector((state: RootState) => state.sharedData);

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    // Set current semester ID for fetching teacher schedules
    useEffect(() => {
        if (timetableCurrentSemester && timetableCurrentSemester.semesterId !== currentSemesterIdForSchedules) {
            dispatch(setRequestSemesterId(timetableCurrentSemester.semesterId));
        }
    }, [dispatch, timetableCurrentSemester, currentSemesterIdForSchedules]);

    // Fetch initial data for forms
    useEffect(() => {
        if (currentSemesterIdForSchedules && !hasLoadedTeacherSchedules && !isLoadingSchedules) {
            dispatch(fetchTeacherSchedulesForRequests(currentSemesterIdForSchedules));
        }
        if (!hasLoadedAllSections && !isLoadingTimetableSections) {
            dispatch(fetchAllTimetableSections());
        }
        // Access isLoadingSharedData.classrooms for specific loading state
        if (!hasLoadedClassroomsShort && !isLoadingSharedData.classrooms) {
            dispatch(fetchAllClassroomsShortList());
        }
    }, [
        dispatch,
        currentSemesterIdForSchedules,
        hasLoadedTeacherSchedules, // <-- Add
        isLoadingSchedules,
        hasLoadedAllSections, // <-- Add
        isLoadingTimetableSections,
        hasLoadedClassroomsShort, // <-- Add
        isLoadingSharedData.classrooms // <-- Use specific loading state
    ]);

    // Handle submission success feedback
    useEffect(() => {
        if (submitSuccess) {
            setSnackbarMessage(activeTab === 0 ? "调课申请已成功提交！" : "考试安排申请已成功提交！");
            setSnackbarOpen(true);
            dispatch(resetRequestSubmitStatus()); // Reset for next submission
        }
    }, [submitSuccess, activeTab, dispatch]);

    // Handle submission error feedback (if error is set by thunk rejection)
    useEffect(() => {
        if (error && (isSubmittingChange === false && isSubmittingExam === false)) { // Check if not currently submitting
            setSnackbarMessage(`提交失败: ${error}`);
            setSnackbarOpen(true);
            // dispatch(resetRequestSubmitStatus()); // Optionally clear error in slice after showing
        }
    }, [error, isSubmittingChange, isSubmittingExam, dispatch]);


    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        dispatch(resetRequestSubmitStatus()); // Reset status when switching tabs
    };

    const handleSubmitScheduleChange = async (data: ScheduleChangeRequestPayload) => {
        await dispatch(submitScheduleChangeApp(data)).unwrap();
    };
    const handleSubmitExamArrangement = async (data: ExamRequestPayload) => {
        await dispatch(submitExamArrangementApp(data)).unwrap();
    };
    const handleCloseSnackbar = () => setSnackbarOpen(false);

    const isLoadingFormData = isLoadingSchedules || isLoadingTimetableSections || isLoadingSharedData.classrooms;
    // Check if all essential data for forms has been loaded (or attempt has been made)
    const essentialDataLoaded = hasLoadedTeacherSchedules && hasLoadedAllSections && hasLoadedClassroomsShort;


    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom>提交申请</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="申请类型" variant="fullWidth">
                    <Tab label="调课申请" icon={<SwapHorizIcon />} iconPosition="start" id="request-tab-0" aria-controls="request-tabpanel-0" />
                    <Tab label="考试安排申请" icon={<EventAvailableIcon />} iconPosition="start" id="request-tab-1" aria-controls="request-tabpanel-1" />
                </Tabs>
            </Box>

            {isLoadingFormData && !essentialDataLoaded &&
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress /><Typography sx={{ ml: 2 }}>加载表单数据...</Typography>
                </Box>
            }
            {/* Show warning if semester info is missing after initial load attempts */}
            {essentialDataLoaded && !timetableCurrentSemester &&
                <Alert severity="warning">无法获取当前学期信息，申请功能暂不可用。</Alert>
            }

            {/* Render forms if essential data has been loaded and semester info is available */}
            {essentialDataLoaded && timetableCurrentSemester && (
                <>
                    <TabPanel value={activeTab} index={0}>
                        <ScheduleChangeRequestForm
                            teacherSchedules={teacherSchedules}
                            allTimetableSections={allSections}
                            allClassroomsList={allClassroomsShort}
                            onSubmitRequest={handleSubmitScheduleChange}
                            isSubmitting={isSubmittingChange}
                        />
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                        <ExamRequestForm
                            teacherSchedules={teacherSchedules} // To select course
                            allTimetableSections={allSections}
                            allClassroomsList={allClassroomsShort}
                            onSubmitRequest={handleSubmitExamArrangement}
                            isSubmitting={isSubmittingExam}
                        />
                    </TabPanel>
                </>
            )}
            <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={submitSuccess ? "success" : "error"} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default SubmitRequestPage;