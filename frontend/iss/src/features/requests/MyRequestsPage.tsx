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
    } = useSelector((state: RootState) => state.requests);

    useEffect(() => {
        // Fetch requests when the component mounts or if myRequests is empty
        if (myRequests.length === 0 && !isLoadingMyRequests) {
            dispatch(fetchTeacherRequests());
        }
    }, [dispatch, myRequests.length, isLoadingMyRequests]);

    const handleRefresh = () => {
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

            {isLoadingMyRequests && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载申请记录中...</Typography>
                </Box>
            )}
            {error && !isLoadingMyRequests && (
                <Alert severity="error" sx={{ mt: 2 }}>加载申请记录失败: {error}</Alert>
            )}
            {!isLoadingMyRequests && !error && (
                <RequestStatusList requests={myRequests} />
            )}
            {!isLoadingMyRequests && !error && myRequests.length === 0 && (
                <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>您还没有提交过任何申请。</Typography>
            )}
        </Paper>
    );
};

export default MyRequestsPage;