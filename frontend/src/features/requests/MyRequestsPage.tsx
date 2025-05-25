// src/features/requests/MyRequestsPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Box, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import { fetchTeacherRequests } from './store/requestSlice'; // Use correct action name
import RequestStatusList from './components/RequestStatusList'; // Ensure this component can handle TeacherRequest[]

const MyRequestsPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        myRequests,
        isLoadingMyRequests,
        error,
        hasLoadedMyRequests, // <-- Add this
    } = useSelector((state: RootState) => state.requests);

    useEffect(() => {
        // Fetch requests when the component mounts or if myRequests is empty and not loaded
        if (!hasLoadedMyRequests && !isLoadingMyRequests) {
            dispatch(fetchTeacherRequests());
        }
    }, [dispatch, hasLoadedMyRequests, isLoadingMyRequests]);

    const handleRefresh = () => {
        // When refreshing, we want to force a fetch, so we don't check hasLoadedMyRequests
        dispatch(fetchTeacherRequests());
    };

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>我的申请记录</Typography>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={isLoadingMyRequests}>
                    刷新
                </Button>
            </Box>

            {isLoadingMyRequests && !hasLoadedMyRequests && ( // Show loading only if not loaded yet
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载申请记录中...</Typography>
                </Box>
            )}
            {error && !isLoadingMyRequests && ( // Show error if not loading (regardless of hasLoaded)
                <Alert severity="error" sx={{ mt: 2 }}>加载申请记录失败: {error}</Alert>
            )}

            {/* Render list if data has been loaded or an attempt was made */}
            {hasLoadedMyRequests && !isLoadingMyRequests && !error && (
                <RequestStatusList requests={myRequests} />
            )}
            {/* Message for empty list after successful load */}
            {hasLoadedMyRequests && !isLoadingMyRequests && !error && myRequests.length === 0 && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>您还没有提交过任何申请。</Typography>
            )}
        </Paper>
    );
};

export default MyRequestsPage;