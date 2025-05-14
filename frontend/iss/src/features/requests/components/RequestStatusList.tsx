// src/features/requests/components/RequestStatusList.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Tooltip, Box } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; // For schedule change
import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // For exam arrangement
import type { TeacherRequest } from '../../../types'; // Adjust path
// Adjust path
import { formatDate } from '../../../utils/dateUtils'; // Adjust path

interface RequestStatusListProps {
    requests: TeacherRequest[];
}

const RequestStatusList: React.FC<RequestStatusListProps> = ({ requests }) => {
    if (!requests || requests.length === 0) {
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>暂无申请记录。</Typography>;
    }

    const getStatusChip = (status: TeacherRequest['status']) => {
        switch (status) {
            case 'pending': return <Chip icon={<PendingActionsIcon />} label="待审批" size="small" color="warning" />;
            case 'approved': return <Chip icon={<CheckCircleOutlineIcon />} label="已批准" size="small" color="success" />;
            case 'rejected': return <Chip icon={<CancelOutlinedIcon />} label="已拒绝" size="small" color="error" />;
            default: return <Chip label={status} size="small" />;
        }
    };

    const renderRequestSpecificDetails = (req: TeacherRequest) => {
        if (req.requestType === 'schedule_change') {
            return (
                <Box>
                    <Typography variant="caption" display="block"><strong>原：</strong>{req.originalScheduleInfo || `课程ID ${req.originalScheduleId}`}</Typography>
                    <Typography variant="caption" display="block" color="primary">
                        <strong>新：</strong>
                        {`周${['一', '二', '三', '四', '五', '六', '日'][req.proposedWeekDay! - 1]} 第${req.proposedSectionId}节 `}
                        {`@ ${req.proposedClassroomInfo || `教室ID ${req.proposedClassroomId}`} [${req.proposedWeeks}]`}
                    </Typography>
                    <Typography variant="caption" display="block"><strong>原因：</strong>{req.reason}</Typography>
                </Box>
            );
        } else if (req.requestType === 'exam_arrangement') {
            return (
                <Box>
                    <Typography variant="caption" display="block"><strong>类型：</strong>{req.examType}</Typography>
                    <Typography variant="caption" display="block"><strong>日期：</strong>{formatDate(req.proposedDate || '', 'yyyy-MM-dd')}</Typography>
                    <Typography variant="caption" display="block" color="primary">
                        <strong>安排：</strong>
                        {`第${req.proposedSectionId}节, ${req.proposedDuration}分钟 @ ${req.proposedClassroomInfo || `教室ID ${req.proposedClassroomId}`}`}
                    </Typography>
                    <Typography variant="caption" display="block"><strong>原因：</strong>{req.examReason || req.reason}</Typography>
                </Box>
            );
        }
        return <Typography variant="caption">未知请求详情</Typography>;
    };

    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 800 }} aria-label="我的申请记录">
                <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>申请课程</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 280 }}>申请详情</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>申请日期</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>处理日期</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>处理人/备注</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.map((req) => (
                        <TableRow key={req.requestId} hover>
                            <TableCell>
                                <Tooltip title={req.requestType === 'schedule_change' ? '调课申请' : '考试安排申请'}>
                                    <Chip
                                        icon={req.requestType === 'schedule_change' ? <SwapHorizIcon /> : <EventAvailableIcon />}
                                        label={req.requestType === 'schedule_change' ? '调课' : '考试'}
                                        size="small"
                                        color={req.requestType === 'schedule_change' ? 'info' : 'secondary'}
                                        variant="outlined"
                                    />
                                </Tooltip>
                            </TableCell>
                            <TableCell>{req.courseName || `(课程ID: ${req.courseId || req.originalScheduleId})`}</TableCell>
                            <TableCell>{renderRequestSpecificDetails(req)}</TableCell>
                            <TableCell>{getStatusChip(req.status)}</TableCell>
                            <TableCell>{formatDate(req.requestedAt, 'yyyy-MM-dd HH:mm')}</TableCell>
                            <TableCell>{req.processedAt ? formatDate(req.processedAt, 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                            <TableCell>
                                {req.approverInfo || ''}
                                {req.status === 'rejected' && req.rejectReason && (
                                    <Tooltip title={`拒绝原因: ${req.rejectReason}`}>
                                        <Typography variant="caption" display="block" color="error.main">(含原因)</Typography>
                                    </Tooltip>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default RequestStatusList;