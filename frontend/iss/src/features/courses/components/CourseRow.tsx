// src/features/courses/components/CourseRow.tsx
import React from 'react';
import { TableRow, TableCell, Button, Chip, Tooltip, Box, Typography, CircularProgress } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/PersonPin'; // More specific teacher icon
import ScheduleIcon from '@mui/icons-material/AccessTime'; // For time part of schedule
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import type { SelectableCourse, EnrollmentRecord } from '../../../types'; // Adjust path
// Adjust path

interface CourseRowProps {
    course: SelectableCourse;
    enrollment?: EnrollmentRecord | null; // Student's enrollment for this course
    onEnroll: (scheduleId: number) => void;
    onWithdraw: (enrollmentId: number, scheduleId: number) => void;
    isProcessingAction: boolean; // True if enroll/withdraw action is in progress for this course
}

const formatCourseScheduleDisplay = (course: SelectableCourse): string => {
    const daysMap = ['一', '二', '三', '四', '五', '六', '日'];
    const dayStr = course.weekDay ? `周${daysMap[course.weekDay - 1]}` : '待定';
    const timeStr = course.startTime && course.endTime
        ? `${course.startTime.substring(0, 5)}-${course.endTime.substring(0, 5)}`
        : '时间待定';
    const weeksStr = course.weeks || '周次待定';
    return `${dayStr} ${timeStr} [${weeksStr}]`;
};

const CourseRow: React.FC<CourseRowProps> = ({ course, enrollment, onEnroll, onWithdraw, isProcessingAction }) => {
    const isEnrolled = !!enrollment && enrollment.status === 'enrolled';

    // Safely handle potentially undefined maxCapacity and enrolledCount
    const currentEnrolledCount = course.enrolledCount ?? 0; // Default to 0 if undefined
    const currentMaxCapacity = course.maxCapacity ?? Infinity; // Default to Infinity if undefined (meaning no limit for full check)

    const isFull = currentEnrolledCount >= currentMaxCapacity;

    const canEnroll = !isEnrolled && !isFull;
    const canWithdraw = isEnrolled;

    const handleEnrollClick = () => {
        if (canEnroll && !isProcessingAction) {
            onEnroll(course.scheduleId);
        }
    };

    const handleWithdrawClick = () => {
        if (canWithdraw && enrollment && !isProcessingAction) {
            onWithdraw(enrollment.enrollmentId, course.scheduleId);
        }
    };

    return (
        <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell>
                <Typography variant="subtitle2" component="div" fontWeight="medium">{course.courseName}</Typography>
                <Typography variant="caption" color="text.secondary">{course.courseCode}</Typography>
            </TableCell>
            <TableCell>
                <Tooltip title="授课教师">
                    <Chip icon={<PersonIcon fontSize="small" />} label={course.teacherName || '待定'} size="small" variant="outlined" />
                </Tooltip>
            </TableCell>
            <TableCell align="center">
                <Tooltip title="学分">
                    <Chip label={`${course.credit || 'N/A'} 分`} size="small" />
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title="上课安排">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip icon={<ScheduleIcon fontSize="small" />} label={formatCourseScheduleDisplay(course)} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                        <Chip icon={<LocationOnIcon fontSize="small" />} label={`${course.building || '教学楼待定'} ${course.roomNumber || '教室待定'}`} size="small" variant="outlined" />
                    </Box>
                </Tooltip>
            </TableCell>
            <TableCell align="center">
                <Tooltip title={course.maxCapacity === undefined ? "名额信息暂无" : `已选 ${currentEnrolledCount} / 容量 ${currentMaxCapacity === Infinity ? '无限制' : currentMaxCapacity}`}>
                    <Chip
                        label={course.maxCapacity === undefined ? "N/A" : `${currentEnrolledCount}/${currentMaxCapacity === Infinity ? '∞' : currentMaxCapacity}`}
                        size="small"
                        color={isFull ? "error" : ((currentEnrolledCount / (currentMaxCapacity === Infinity ? currentEnrolledCount + 1 : currentMaxCapacity)) >= 0.8 ? "warning" : "success")} // Avoid division by zero for Infinity
                        variant="filled"
                    />
                </Tooltip>
            </TableCell>
            <TableCell align="center">
                {isProcessingAction ? (
                    <CircularProgress size={24} />
                ) : isEnrolled ? (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={handleWithdrawClick}
                        disabled={!canWithdraw}
                        startIcon={<CancelOutlinedIcon />}
                    >
                        退选
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color={isFull && currentMaxCapacity !== Infinity ? "inherit" : "primary"} // Adjust color if full
                        size="small"
                        onClick={handleEnrollClick}
                        disabled={!canEnroll || (isFull && currentMaxCapacity !== Infinity)}
                        startIcon={(isFull && currentMaxCapacity !== Infinity) ? <InfoIcon /> : <CheckCircleOutlineIcon />}
                    >
                        {(isFull && currentMaxCapacity !== Infinity) ? '已满' : '选课'}
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );
};

export default CourseRow;