// src/features/exams/components/ExamList.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon from '@mui/icons-material/School';
import type { ExamArrangement } from '../../../types'; // Adjust path
import { formatDate } from '../../../utils/dateUtils'; // Adjust path

interface ExamListProps {
    exams: ExamArrangement[];
}

const ExamList: React.FC<ExamListProps> = ({ exams }) => {
    if (!exams || exams.length === 0) {
        // 此处返回的 Typography 不在 Table 结构内，所以不会引起 TableRow 的 hydration 问题
        return <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>本学期暂无考试安排信息。</Typography>;
    }

    const renderExamTypeChip = (type: ExamArrangement['examType']): React.ReactNode => {
        let labelText: string = type;
        let chipColor: "primary" | "secondary" | "error" | "warning" | "info" | "success" | "default" = "default";
        switch (type) {
            case 'final': labelText = '期末考试'; chipColor = 'primary'; break;
            case 'midterm': labelText = '期中考试'; chipColor = 'secondary'; break;
            case 'makeup': labelText = '补考'; chipColor = 'warning'; break;
            // 确保所有可能的 examType 都有处理，或者有一个 default case
            default: labelText = type; break;
        }
        return <Chip label={labelText} size="small" color={chipColor} variant="filled" />;
    };

    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 700 }} aria-label="考试安排列表">
                <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>课程名称</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>考试类型</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>日期</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>时间</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>地点</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>时长 (分钟)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {exams.map((exam) => (
                        <TableRow key={exam.examId} hover>
                            <TableCell component="th" scope="row">
                                <Chip icon={<SchoolIcon />} label={`${exam.courseName} (${exam.courseCode})`} variant="outlined" size="small" />
                            </TableCell>
                            <TableCell>{renderExamTypeChip(exam.examType)}</TableCell>
                            <TableCell>
                                <Chip icon={<EventIcon />} label={formatDate(exam.examDate, 'yyyy年MM月dd日')} size="small" />
                            </TableCell>
                            <TableCell>
                                <Chip icon={<AccessTimeFilledIcon />} label={`${exam.startTime?.substring(0, 5)} - ${exam.endTime?.substring(0, 5)}`} size="small" />
                            </TableCell>
                            <TableCell>
                                <Chip icon={<LocationOnIcon />} label={`${exam.building} ${exam.roomNumber}`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">{exam.duration}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ExamList;