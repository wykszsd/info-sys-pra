// src/features/timetable/components/TimetableHeader.tsx
import React from 'react';
import { Typography, Paper } from '@mui/material';

const days: string[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TimetableHeader: React.FC = () => {
    return (
        <>
            {/* Empty top-left corner cell for alignment */}
            <Paper elevation={0} sx={{
                gridColumn: 1, gridRow: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc',
                position: 'sticky', top: 0, left: 0, zIndex: 15,
                backgroundColor: 'grey.200',
            }}>
                <Typography variant="caption" fontWeight="bold">时间</Typography>
            </Paper>

            {/* Day headers */}
            {days.map((day: string, index: number) => (
                <Paper
                    key={day}
                    elevation={1}
                    sx={{
                        gridColumn: index + 2,
                        gridRow: 1,
                        textAlign: 'center',
                        p: 1,
                        fontWeight: 'bold',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: 'grey.100',
                        borderRight: index < days.length - 1 ? '1px solid #e0e0e0' : undefined,
                        borderBottom: '1px solid #ccc',
                    }}
                >
                    <Typography variant="subtitle2">{day}</Typography>
                </Paper>
            ))}
        </>
    );
};

export default TimetableHeader; // <<< 确认这一行存在且正确