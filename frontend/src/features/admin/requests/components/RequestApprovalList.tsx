// src/features/admin/requests/components/RequestApprovalList.tsx
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Button, Chip, Box, Tooltip, IconButton, Collapse, Grid // 保持 Grid 导入
} from '@mui/material';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import type { TeacherRequest, RequestType } from '../../../../types'; // 调整路径
import { formatDate } from '../../../../utils/dateUtils'; // 调整路径

interface RequestApprovalListProps {
    requests: TeacherRequest[];
    onApprove: (requestId: number) => void;
    onReject: (requestId: number) => void;
    isProcessingAction: (requestId: number) => boolean;
}

const getRequestTypeLabel = (type: RequestType | undefined) => {
    if (type === 'schedule_change') return '调课申请';
    if (type === 'exam_arrangement') return '考试安排申请';
    return '未知类型';
};

// 辅助函数：格式化原始课程安排详情
const formatOriginalScheduleDetails = (req: TeacherRequest): string => {
    if (req.originalScheduleInfo && req.originalScheduleInfo.trim() !== '') {
        return req.originalScheduleInfo;
    }

    const parts: string[] = [];
    const daysMap = ['一', '二', '三', '四', '五', '六', '日'];

    if (req.courseName) {
        parts.push(req.courseName);
    } else if (req.originalScheduleId) {
        parts.push(`课程ID ${req.originalScheduleId}`);
    }

    if (req.originalWeekDay && req.originalSectionId) {
        parts.push(`周${daysMap[req.originalWeekDay - 1]} 第${req.originalSectionId}节`);
    } else if (req.originalSectionId) {
        parts.push(`第${req.originalSectionId}节`);
    } else if (req.originalWeekDay) {
        parts.push(`周${daysMap[req.originalWeekDay - 1]}`);
    }


    if (req.originalClassroomInfo) {
        parts.push(`@ ${req.originalClassroomInfo}`);
    } else if (req.originalClassroomId) {
        parts.push(`@ 教室ID ${req.originalClassroomId}`);
    }

    if (req.originalWeeks) {
        parts.push(`[${req.originalWeeks}]`);
    }

    if (parts.length === 0 && req.originalScheduleId) {
        return `原课程ID: ${req.originalScheduleId} (详情不足)`;
    }

    return parts.length > 0 ? parts.join(' ') : '原安排信息不详';
};


const RequestApprovalList: React.FC<RequestApprovalListProps> = ({
    requests,
    onApprove,
    onReject,
    isProcessingAction
}) => {
    const [expandedRow, setExpandedRow] = React.useState<number | null>(null);

    const handleToggleExpand = (requestId: number) => {
        setExpandedRow(expandedRow === requestId ? null : requestId);
    };

    if (!requests || requests.length === 0) {
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>太棒了！当前没有待审批的请求。</Typography>;
    }

    const renderScheduleChangeDetails = (req: TeacherRequest) => (
        <Grid container spacing={1} sx={{ p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold">原安排:</Typography>
                <Typography variant="caption" display="block">
                    {formatOriginalScheduleDetails(req)} {/* 使用辅助函数 */}
                </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold" color="primary.main">新安排:</Typography>
                <Typography variant="caption" display="block">
                    周{req.proposedWeekDay ? ['一', '二', '三', '四', '五', '六', '日'][req.proposedWeekDay - 1] : '?'}
                    {` 第${req.proposedSectionId || '?'}节 `}
                </Typography>
                <Typography variant="caption" display="block">
                    教室: {req.proposedClassroomInfo || (req.proposedClassroomId ? `ID ${req.proposedClassroomId}` : '?')}
                </Typography>
                <Typography variant="caption" display="block">周次: {req.proposedWeeks || '?'}</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold">调课原因:</Typography>
                <Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-wrap' }}>{req.reason}</Typography>
            </Grid>
        </Grid>
    );

    const renderExamArrangementDetails = (req: TeacherRequest) => (
        <Grid container spacing={1} sx={{ p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold">考试类型:</Typography>
                <Typography variant="caption" display="block">{req.examType === 'final' ? '期末' : req.examType === 'midterm' ? '期中' : req.examType || '补考'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold">建议日期:</Typography>
                <Typography variant="caption" display="block">{formatDate(req.proposedDate || '', 'yyyy-MM-dd')}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold" color="primary.main">建议安排:</Typography>
                <Typography variant="caption" display="block">
                    {`第${req.proposedSectionId || '?'}节, 时长: ${req.proposedDuration || '?'}分钟`}
                </Typography>
                <Typography variant="caption" display="block">
                    考场: {req.proposedClassroomInfo || (req.proposedClassroomId ? `ID ${req.proposedClassroomId}` : '?')}
                </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}> {/* 使用 size prop */}
                <Typography variant="caption" display="block" fontWeight="bold">申请原因/备注:</Typography>
                <Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-wrap' }}>{req.examReason || req.reason}</Typography>
            </Grid>
        </Grid>
    );


    return (
        <TableContainer component={Paper} elevation={2} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 950 }} aria-label="待审批请求列表">
                <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                        <TableCell sx={{ width: '5%' }}>{null}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>类型</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>申请人</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>申请课程</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>核心信息</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>申请时间</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.map((req) => {
                        const isCurrentRowProcessing = isProcessingAction(req.requestId);
                        const isExpanded = expandedRow === req.requestId;
                        return (
                            <React.Fragment key={req.requestId}>
                                <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, opacity: isCurrentRowProcessing ? 0.6 : 1, cursor: 'pointer' }} onClick={() => handleToggleExpand(req.requestId)}>
                                    <TableCell>
                                        <IconButton aria-label="expand row" size="small">
                                            {isExpanded ? <InfoOutlinedIcon color="action" /> : <InfoOutlinedIcon color="disabled" />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={getRequestTypeLabel(req.requestType)}>
                                            <Chip
                                                icon={req.requestType === 'schedule_change' ? <SwapHorizIcon /> : <EventAvailableIcon />}
                                                label={req.requestType === 'schedule_change' ? '调课' : '考试'}
                                                size="small"
                                                color={req.requestType === 'schedule_change' ? 'info' : 'secondary'}
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Chip icon={<PersonOutlineIcon />} label={req.teacherName || req.teacherId || '未知教师'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{req.courseName || `(课程ID: ${req.courseId || req.originalScheduleId})`}</TableCell>
                                    <TableCell>
                                        {req.requestType === 'schedule_change'
                                            ? `原: ${formatOriginalScheduleDetails(req).substring(0, 15)}... 新: 周${req.proposedWeekDay ? ['一', '二', '三', '四', '五', '六', '日'][req.proposedWeekDay - 1] : '?'} 第${req.proposedSectionId || '?'}节...`
                                            : `类型: ${req.examType || '?'}, 日期: ${formatDate(req.proposedDate || '', 'MM-dd')}, 第${req.proposedSectionId || '?'}节...`
                                        }
                                    </TableCell>
                                    <TableCell>{formatDate(req.requestedAt, 'yyyy-MM-dd HH:mm')}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <Button variant="contained" size="small" color="success" startIcon={<ThumbUpAltOutlinedIcon />} onClick={(e) => { e.stopPropagation(); onApprove(req.requestId); }} disabled={isCurrentRowProcessing}>批准</Button>
                                            <Button variant="contained" size="small" color="error" startIcon={<ThumbDownAltOutlinedIcon />} onClick={(e) => { e.stopPropagation(); onReject(req.requestId); }} disabled={isCurrentRowProcessing}>拒绝</Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                            <Box sx={{ margin: 1, p: 2, border: '1px solid #eee', borderRadius: 1, backgroundColor: 'rgb(245, 245, 245, 0.5)' }}>
                                                <Typography variant="h6" gutterBottom component="div" fontSize="1rem" fontWeight="medium">
                                                    申请详情 (ID: {req.requestId})
                                                </Typography>
                                                {req.requestType === 'schedule_change' ? renderScheduleChangeDetails(req) : renderExamArrangementDetails(req)}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default RequestApprovalList;