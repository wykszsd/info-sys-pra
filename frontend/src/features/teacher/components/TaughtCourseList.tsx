// src/features/teacher/components/TaughtCourseList.tsx
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Box, Tooltip, IconButton } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/EventNote';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import InfoIcon from '@mui/icons-material/Info';
import type { Schedule } from '../../../types';

interface TaughtCourseListProps {
    schedules: Schedule[];
}

const TaughtCourseList: React.FC<TaughtCourseListProps> = ({ schedules }) => {
    console.log('[TaughtCourseList] Received schedules:', schedules); // Log received schedules

    const formatScheduleDisplay = (s: Schedule): string => {
        const daysMap = ['一', '二', '三', '四', '五', '六', '日'];
        const dayStr = (s.weekDay && s.weekDay >= 1 && s.weekDay <= 7) ? `周${daysMap[s.weekDay - 1]}` : '待定';
        const timeStr = s.startTime && s.endTime
            ? `${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)}`
            : '时间待定';
        const weeksStr = s.weeks || '周次待定';
        return `${dayStr} ${timeStr} [${weeksStr}]`;
    };

    const groupedByCourse = useMemo(() => {
        if (!Array.isArray(schedules)) {
            console.error('[TaughtCourseList] schedules prop is not an array:', schedules);
            return {};
        }
        return schedules.reduce((acc, schedule) => {
            if (!schedule || typeof schedule.courseId !== 'number') {
                console.warn('[TaughtCourseList] Invalid schedule item found:', schedule);
                return acc;
            }
            const key = schedule.courseId.toString();
            if (!acc[key]) {
                acc[key] = {
                    courseName: schedule.courseName || '未知课程',
                    courseCode: schedule.courseCode || 'N/A',
                    credit: schedule.credit,
                    slots: [],
                };
            }
            acc[key].slots.push(schedule);
            return acc;
        }, {} as Record<string, { courseName: string; courseCode: string; credit?: number; slots: Schedule[] }>);
    }, [schedules]);

    console.log('[TaughtCourseList] Grouped courses:', groupedByCourse);

    if (!schedules || schedules.length === 0) {
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>本学期您没有教学安排。</Typography>;
    }

    if (Object.keys(groupedByCourse).length === 0 && schedules.length > 0) {
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>无法解析教学安排数据。</Typography>;
    }

    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 750 }} aria-label="我的教学安排">
                <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>课程名称 / 代码 (学分)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>上课安排 (时间/地点/周次)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>已选/容量</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.values(groupedByCourse).map((group) => (
                        // 修改点：确保 <TableRow> 和第一个 <TableCell> 之间没有多余的空格或换行。
                        // 最简单的方法是让它们在 JSX 中紧密相连。
                        <TableRow key={group.courseCode + group.courseName} hover><TableCell component="th" scope="row">
                            <Typography variant="subtitle2" fontWeight="medium">{group.courseName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {group.courseCode} {group.credit !== undefined ? `(${group.credit}学分)` : ''}
                            </Typography>
                        </TableCell><TableCell>
                                {group.slots.map((slot, index) => (
                                    <Box key={`${slot.scheduleId}-${index}`} sx={{ mb: group.slots.length > 1 ? 1 : 0, pb: group.slots.length > 1 ? 1 : 0, borderBottom: group.slots.length > 1 ? '1px dashed #eee' : 'none', '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 } }}>
                                        <Chip icon={<ScheduleIcon fontSize="small" />} label={formatScheduleDisplay(slot)} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                                        <br />
                                        <Chip icon={<LocationOnIcon fontSize="small" />} label={`${slot.classroomBuilding || 'N/A'} ${slot.classroomRoomNumber || 'N/A'}`} size="small" variant="outlined" />
                                    </Box>
                                ))}
                            </TableCell><TableCell align="center">
                                {group.slots.map((slot, index) => (
                                    <Box key={`enroll-${slot.scheduleId}-${index}`} sx={{ mb: 0.5 }}>
                                        <Tooltip title={slot.maxCapacity === undefined ? "名额信息暂无" : `课程班容量 ${slot.maxCapacity}, 已选 ${slot.enrolledCount ?? 0}`}>
                                            <span>
                                                <Chip
                                                    icon={<PeopleAltIcon fontSize="small" />}
                                                    label={slot.maxCapacity === undefined ? "N/A" : `${slot.enrolledCount ?? '0'}/${slot.maxCapacity}`}
                                                    size="small"
                                                    color={slot.maxCapacity !== undefined && (slot.enrolledCount ?? 0) >= slot.maxCapacity ? "error" : "default"}
                                                    disabled={slot.maxCapacity === undefined}
                                                />
                                            </span>
                                        </Tooltip>
                                    </Box>
                                ))}
                            </TableCell><TableCell>
                                <Tooltip title="查看学生名单 (待实现)">
                                    <span>
                                        <IconButton size="small" disabled>
                                            <InfoIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </TableCell></TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TaughtCourseList;