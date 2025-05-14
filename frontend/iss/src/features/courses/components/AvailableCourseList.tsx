// src/features/courses/components/AvailableCourseList.tsx
import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import type { SelectableCourse, EnrollmentRecord } from '../../../types'; // Adjust path
// Adjust path
import CourseRow from './CourseRow';

interface AvailableCourseListProps {
    courses: SelectableCourse[];
    enrollmentsMap: Map<number, EnrollmentRecord>; // Map for quick lookup: scheduleId -> EnrollmentRecord
    onEnroll: (scheduleId: number) => void;
    onWithdraw: (enrollmentId: number, scheduleId: number) => void;
    processingActions: Set<number>; // Set of scheduleIds currently being processed
    // TODO: Add sort state and handler if implementing client-side sort
    // sortConfig: { key: keyof SelectableCourse, direction: 'asc' | 'desc' } | null;
    // onRequestSort: (key: keyof SelectableCourse) => void;
}

const AvailableCourseList: React.FC<AvailableCourseListProps> = ({
    courses,
    enrollmentsMap,
    onEnroll,
    onWithdraw,
    processingActions,
    // sortConfig,
    // onRequestSort
}) => {

    if (!courses || courses.length === 0) {
        return <Alert severity="info" sx={{ mt: 3, mx: 1 }}>当前学期暂无可选择的课程，或请尝试调整筛选条件。</Alert>;
    }

    // Client-side sorting example (can be moved to parent or done via API)
    // const sortedCourses = React.useMemo(() => {
    //     let sortableItems = [...courses];
    //     if (sortConfig !== null) {
    //         sortableItems.sort((a, b) => {
    //             if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    //             if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    //             return 0;
    //         });
    //     }
    //     return sortableItems;
    // }, [courses, sortConfig]);


    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="可选课程列表">
                <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: 'grey.200', fontWeight: 'bold' } }}>
                        <TableCell>课程名称 / 代码</TableCell>
                        <TableCell>教师</TableCell>
                        <TableCell align="center">学分</TableCell>
                        <TableCell>时间 / 地点 / 周次</TableCell>
                        <TableCell align="center">名额 (已选/容量)</TableCell>
                        <TableCell align="center">操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {/* Use sortedCourses if implementing client-side sort */}
                    {courses.map((course) => {
                        const enrollment = enrollmentsMap.get(course.scheduleId);
                        const isProcessing = processingActions.has(course.scheduleId);
                        return (
                            <CourseRow
                                key={course.scheduleId}
                                course={course}
                                enrollment={enrollment}
                                onEnroll={onEnroll}
                                onWithdraw={onWithdraw}
                                isProcessingAction={isProcessing}
                            />
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AvailableCourseList;