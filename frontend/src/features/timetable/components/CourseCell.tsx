// src/features/timetable/components/CourseCell.tsx
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Schedule } from '../../../types'; // Adjust path if necessary
// Adjust path if necessary

interface CourseCellProps {
    scheduleItem: Schedule; // Renamed for clarity
    // span prop might be calculated and applied by TimetableGrid directly to the Box
}

// Consistent hashing function for color generation
const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;

    // Make colors lighter and ensure they are not too dark for white text
    const lighten = (val: number) => Math.min(255, val + 70); // Adjust brightness boost
    const finalR = lighten(r);
    const finalG = lighten(g);
    const finalB = lighten(b);

    // Ensure good contrast with white text by checking luminance.
    // If luminance is too high (color too light), slightly darken.
    // (0.299*R + 0.587*G + 0.114*B) > 186 is a common threshold for white text on colored background

    return `rgba(${finalR}, ${finalG}, ${finalB}, 0.85)`; // Return RGBA for slight transparency
};


const CourseCell: React.FC<CourseCellProps> = ({ scheduleItem }) => {
    const courseName = scheduleItem.courseName || scheduleItem.courseCode || '未知课程';
    const location = `${scheduleItem.classroomBuilding || ''}${scheduleItem.classroomRoomNumber || '地点未知'}`;
    const teacher = scheduleItem.teacherName || '教师未知';
    const weeks = scheduleItem.weeks || '周次未知';

    const cellBackgroundColor = stringToColor(courseName);
    // Determine text color based on background luminance for better contrast
    const getTextColor = (bgColor: string): string => {
        try {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const r = parseInt(rgb[0]);
                const g = parseInt(rgb[1]);
                const b = parseInt(rgb[2]);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                return luminance > 170 ? '#222' : '#f8f8f8'; // Darker text on lighter backgrounds
            }
        } catch (e) { /* ignore */ }
        return '#fff'; // Default to white
    };
    const textColor = getTextColor(cellBackgroundColor);


    const cellStyle = {
        backgroundColor: cellBackgroundColor,
        color: textColor,
        padding: '6px',
        borderRadius: '4px',
        overflow: 'hidden',
        fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' }, // Responsive font size
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start', // Align content to top
        alignItems: 'center',
        textAlign: 'center',
        height: '100%', // Fill the grid cell
        boxSizing: 'border-box' as 'border-box', // Ensure padding doesn't overflow
        cursor: 'pointer',
        border: `1px solid rgba(${textColor === '#fff' ? '255,255,255' : '0,0,0'}, 0.2)`,
    };

    const tooltipContent = (
        <React.Fragment>
            <Typography variant="subtitle2" component="div">{courseName}</Typography>
            <Typography variant="caption" display="block">教师: {teacher}</Typography>
            <Typography variant="caption" display="block">地点: {location}</Typography>
            <Typography variant="caption" display="block">时间: 周{['一', '二', '三', '四', '五', '六', '日'][scheduleItem.weekDay - 1]} 第{scheduleItem.sectionId}节</Typography>
            <Typography variant="caption" display="block">({scheduleItem.startTime?.substring(0, 5)}-{scheduleItem.endTime?.substring(0, 5)})</Typography>
            <Typography variant="caption" display="block">周次: {weeks}</Typography>
            {scheduleItem.credit && <Typography variant="caption" display="block">学分: {scheduleItem.credit}</Typography>}
        </React.Fragment>
    );

    return (
        <Tooltip title={tooltipContent} placement="top" arrow TransitionProps={{ timeout: 300 }}>
            <Box sx={cellStyle}>
                <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {courseName}
                </Typography>
                <Typography variant="caption" component="div" sx={{ lineHeight: 1.1, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{location}
                </Typography>
                {/* Show teacher only if enough space (e.g. cell spans multiple sections) */}
                {/* This logic is better handled by TimetableGrid based on span */}
                <Typography variant="caption" component="div" sx={{ lineHeight: 1.1, display: { xs: 'none', md: 'block' }, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ({teacher})
                </Typography>
            </Box>
        </Tooltip>
    );
};

export default CourseCell;