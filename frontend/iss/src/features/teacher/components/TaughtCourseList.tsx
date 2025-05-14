// src/features/teacher/components/TaughtCourseList.tsx
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Box, Tooltip, IconButton } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/EventNote'; // More suitable for schedule
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // For enrolled count
import InfoIcon from '@mui/icons-material/Info';
import type { Schedule } from '../../../types'; // Adjust path
// Adjust path

interface TaughtCourseListProps {
    schedules: Schedule[];
}

const TaughtCourseList: React.FC<TaughtCourseListProps> = ({ schedules }) => {
    if (!schedules || schedules.length === 0) {
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>本学期您没有教学安排。</Typography>;
    }

    const formatScheduleDisplay = (s: Schedule): string => {
        const daysMap = ['一', '二', '三', '四', '五', '六', '日'];
        const dayStr = s.weekDay ? `周${daysMap[s.weekDay - 1]}` : '待定';
        const timeStr = s.startTime && s.endTime
            ? `${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)}`
            : '时间待定';
        const weeksStr = s.weeks || '周次待定';
        return `${dayStr} ${timeStr} [${weeksStr}]`;
    };

    const groupedByCourse = useMemo(() => {
        return schedules.reduce((acc, schedule) => {
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
                        <TableRow key={group.courseCode} hover>
                            <TableCell component="th" scope="row">
                                <Typography variant="subtitle2" fontWeight="medium">{group.courseName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {group.courseCode} {group.credit !== undefined ? `(${group.credit}学分)` : ''}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                {group.slots.map(slot => (
                                    <Box key={slot.scheduleId} sx={{ mb: group.slots.length > 1 ? 1 : 0, pb: group.slots.length > 1 ? 1 : 0, borderBottom: group.slots.length > 1 ? '1px dashed #eee' : 'none', '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 } }}>
                                        <Chip icon={<ScheduleIcon fontSize="small" />} label={formatScheduleDisplay(slot)} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                                        <br />
                                        <Chip icon={<LocationOnIcon fontSize="small" />} label={`${slot.building || 'N/A'} ${slot.roomNumber || 'N/A'}`} size="small" variant="outlined" />
                                    </Box>
                                ))}
                            </TableCell>
                            <TableCell align="center">
                                {group.slots.map(slot => (
                                    <Box key={`enroll-${slot.scheduleId}`} sx={{ mb: 0.5 }}>
                                        <Tooltip title={slot.maxCapacity === undefined ? "名额信息暂无" : `课程班容量 ${slot.maxCapacity}, 已选 ${slot.enrolledCount ?? 0}`}>
                                            {/* 修正：为 disabled Chip 添加 span 包裹器，如果 Chip 本身会是 disabled */}
                                            {/* 注意：Chip 组件通常不会直接有 disabled 属性来阻止事件。如果这里的 Tooltip 是为 Chip 服务的，且Chip本身没有disabled状态，则此处无需span。 */}
                                            {/* 但如果 Chip 在某些条件下会变成 disabled 并且你希望Tooltip依然有效（虽然不常见于Chip），则需要 span。 */}
                                            {/* 假设这里的Tooltip是为Chip内容服务的，Chip本身不会disabled阻止事件，则原始代码对Chip的Tooltip是OK的。*/}
                                            <Chip
                                                icon={<PeopleAltIcon fontSize="small" />}
                                                label={slot.maxCapacity === undefined ? "N/A" : `${slot.enrolledCount ?? 0}/${slot.maxCapacity}`}
                                                size="small"
                                                color={slot.maxCapacity !== undefined && slot.enrolledCount !== undefined && slot.enrolledCount >= slot.maxCapacity ? "error" : "default"}
                                            />
                                        </Tooltip>
                                    </Box>
                                ))}
                            </TableCell>
                            <TableCell>
                                <Tooltip title="查看学生名单 (待实现)">
                                    {/* --- 修改开始 --- */}
                                    <span> {/* 添加 span 包裹器 */}
                                        <IconButton size="small" disabled>
                                            <InfoIcon />
                                        </IconButton>
                                    </span>
                                    {/* --- 修改结束 --- */}
                                </Tooltip>
                                {/* Link to post assignment for this course? */}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TaughtCourseList;