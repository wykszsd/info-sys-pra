// src/features/timetable/components/TimetableSidebar.tsx
import React from 'react';
import { Typography, Paper } from '@mui/material';
import type { ClassSection } from '../../../types'; // Adjust path
// Adjust path
import { formatTimeString } from '../../../utils/timetableUtils'; // Adjust path

interface TimetableSidebarProps {
    sections: ClassSection[];
}

const TimetableSidebar: React.FC<TimetableSidebarProps> = ({ sections }) => {
    // Sections should be pre-sorted by timetableSlice
    return (
        <>
            {sections.map((section, index) => (
                <Paper
                    key={section.sectionId}
                    elevation={1}
                    sx={{
                        gridColumn: 1,        // First column
                        gridRow: index + 2,   // Start from second row (after header)
                        textAlign: 'center',
                        p: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'sticky',
                        left: 0, // Stick to left
                        zIndex: 5, // Below header, above scroll content if header overlaps
                        backgroundColor: 'background.paper',
                        borderBottom: '1px solid #e0e0e0',
                        borderRight: '1px solid #ccc',
                        minHeight: '70px', // Match cell height
                    }}
                >
                    <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>{section.sectionId}</Typography>
                    <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {formatTimeString(section.startTime)}
                    </Typography>
                    <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {formatTimeString(section.endTime)}
                    </Typography>
                </Paper>
            ))}
        </>
    );
};

export default TimetableSidebar;