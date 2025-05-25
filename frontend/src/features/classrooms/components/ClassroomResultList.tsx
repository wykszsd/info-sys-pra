// src/features/classrooms/components/ClassroomResultList.tsx
import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tooltip } from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PeopleIcon from '@mui/icons-material/People';
import ComputerIcon from '@mui/icons-material/Computer';
import ScienceIcon from '@mui/icons-material/Science';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { AvailableClassroom } from '../../../types'; // Adjust path

interface ClassroomResultListProps {
    results: AvailableClassroom[];
}

const getEquipmentIconAndLabel = (equipment: AvailableClassroom['equipment']): { icon?: React.ReactElement, label: string } => {
    switch (equipment) {
        case 'multimedia': return { icon: <ComputerIcon fontSize="small" />, label: '多媒体' };
        case 'lab': return { icon: <ScienceIcon fontSize="small" />, label: '实验室' };
        case 'basic': return { icon: <HelpOutlineIcon fontSize="small" />, label: '基础设备' };
        default: return { icon: undefined, label: String(equipment) }; // Ensure label is always a string
    }
};

const ClassroomResultList: React.FC<ClassroomResultListProps> = ({ results }) => {
    if (!results || results.length === 0) {
        return null;
    }

    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="空教室查询结果">
                <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>教学楼</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>教室号</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>容量</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>设备类型</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {results.map((classroom) => {
                        const { icon, label } = getEquipmentIconAndLabel(classroom.equipment);
                        return (
                            <TableRow
                                key={classroom.classroomId}
                                hover
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell component="th" scope="row">
                                    {classroom.building}
                                </TableCell>
                                <TableCell>
                                    <Chip icon={<MeetingRoomIcon />} label={classroom.roomNumber} variant="outlined" size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    {/* --- FIX START --- */}
                                    <Chip
                                        icon={<PeopleIcon />}
                                        label={typeof classroom.capacity === 'number' ? classroom.capacity.toString() : 'N/A'}
                                        size="small"
                                    />
                                    {/* --- FIX END --- */}
                                </TableCell>
                                <TableCell>
                                    <Tooltip title={label}>
                                        <Chip icon={icon} label={label} size="small" variant="outlined" />
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ClassroomResultList;