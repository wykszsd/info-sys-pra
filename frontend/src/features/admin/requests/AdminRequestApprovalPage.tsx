// src/features/admin/requests/AdminRequestApprovalPage.tsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Paper, Typography, CircularProgress, Alert, Box, Snackbar, Tabs, Tab, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AppDispatch, RootState } from '../../../store'; // Adjust path
// Adjust path
import {
    fetchPendingAdminRequests,
    approveAdminRequestAction, // Use renamed action
    rejectAdminRequestAction,   // Use renamed action
    setAdminRequestFilterType
} from './store/adminRequestSlice'; // Adjust path
import RequestApprovalList from './components/RequestApprovalList';
import RejectReasonDialog from './components/RejectReasonDialog';
import type { RequestType } from '../../../types'; // Adjust path
// Adjust path

const AdminRequestApprovalPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        pendingRequests,
        isLoading,
        isProcessing, // This is a Set of requestIds
        error,
        filterType
    } = useSelector((state: RootState) => state.adminRequests); // Ensure slice key is 'adminRequests'

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [currentRejectingId, setCurrentRejectingId] = useState<number | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        dispatch(fetchPendingAdminRequests({ filterType }));
    }, [dispatch, filterType]);

    const handleApprove = async (requestId: number) => {
        try {
            await dispatch(approveAdminRequestAction(requestId)).unwrap(); // Use unwrap to catch rejection
            setSnackbar({ open: true, message: `请求 #${requestId} 已成功批准。`, severity: 'success' });
        } catch (err: any) {
            setSnackbar({ open: true, message: `批准请求 #${requestId} 失败: ${err || '未知错误'}`, severity: 'error' });
        }
    };

    const handleOpenRejectDialog = (requestId: number) => {
        setCurrentRejectingId(requestId);
        setRejectDialogOpen(true);
    };

    const handleConfirmReject = async (reason: string) => {
        if (currentRejectingId !== null) {
            try {
                await dispatch(rejectAdminRequestAction({ requestId: currentRejectingId, reason })).unwrap();
                setSnackbar({ open: true, message: `请求 #${currentRejectingId} 已成功拒绝。`, severity: 'success' });
            } catch (err: any) {
                setSnackbar({ open: true, message: `拒绝请求 #${currentRejectingId} 失败: ${err || '未知错误'}`, severity: 'error' });
            } finally {
                setRejectDialogOpen(false);
                setCurrentRejectingId(null);
            }
        }
    };

    const handleFilterChange = (_event: React.SyntheticEvent, newValue: 'all' | RequestType) => {
        dispatch(setAdminRequestFilterType(newValue));
    };

    const handleRefresh = () => {
        dispatch(fetchPendingAdminRequests({ filterType }));
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 64px - 48px)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" component="h1">请求审批中心</Typography>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={isLoading}>
                    刷新列表
                </Button>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={filterType} onChange={handleFilterChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                    <Tab label="全部待审批" value="all" />
                    <Tab label="调课申请" value="schedule_change" />
                    <Tab label="考试安排申请" value="exam_arrangement" />
                </Tabs>
            </Box>

            {isLoading && pendingRequests.length === 0 && ( // Show main loader only on initial load
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>加载待审批请求...</Typography>
                </Box>
            )}
            {error && !isLoading && (
                <Alert severity="error" sx={{ mt: 2 }}>加载请求列表失败: {error}</Alert>
            )}

            {!isLoading && !error && ( // Always render list if not loading and no critical error
                <RequestApprovalList
                    requests={pendingRequests}
                    onApprove={handleApprove}
                    onReject={handleOpenRejectDialog}
                    isProcessingAction={(id: number) => isProcessing.has(id)} // Pass the function to check Set
                />
            )}
            {/* Message for no pending requests after loading and no error */}
            {!isLoading && !error && pendingRequests.length === 0 && (
                <Typography sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>当前没有待审批的请求。</Typography>
            )}


            <RejectReasonDialog
                open={rejectDialogOpen}
                onClose={() => { setRejectDialogOpen(false); setCurrentRejectingId(null); }}
                onSubmit={handleConfirmReject}
                title="输入拒绝原因"
            />
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminRequestApprovalPage;