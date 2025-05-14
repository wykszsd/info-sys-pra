// src/features/timetable/components/WeekSelector.tsx
import React from 'react';
import { Box, Typography, IconButton, Select, MenuItem, FormControl, InputLabel, type SelectChangeEvent, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import type { SemesterInfo } from '../../../types';
// Removed date-fns imports that are now handled in slice or not directly needed here
import { getWeekDates, formatDate } from '../../../utils/dateUtils';
import { useSelector } from 'react-redux'; // Import useSelector
import type { RootState } from '../../../store'; // Import RootState

interface WeekSelectorProps {
    currentSelectedWeek: number | null;
    semesterInfo: SemesterInfo | null; // semesterInfo is still useful for displaying semester dates
    onWeekChange: (newWeek: number) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
    currentSelectedWeek,
    semesterInfo, // Keep for displaying dates if needed
    onWeekChange,
}) => {
    // Get totalSemesterWeeks from Redux store
    const totalSemesterWeeksFromStore = useSelector((state: RootState) => state.timetable.totalSemesterWeeks);

    // Use totalSemesterWeeksFromStore if available, otherwise fallback or use a default
    const totalWeeks = totalSemesterWeeksFromStore ?? 18; // Fallback to 18 if not yet loaded

    const handlePreviousWeek = () => {
        if (currentSelectedWeek && currentSelectedWeek > 1) {
            onWeekChange(currentSelectedWeek - 1);
        }
    };

    const handleNextWeek = () => {
        if (currentSelectedWeek && currentSelectedWeek < totalWeeks) {
            onWeekChange(currentSelectedWeek + 1);
        }
    };

    const handleSelectWeek = (event: SelectChangeEvent<string>) => {
        const newWeek = Number(event.target.value);
        if (!isNaN(newWeek) && newWeek > 0 && newWeek <= totalWeeks) {
            onWeekChange(newWeek);
        }
    };

    const weekDates = currentSelectedWeek && semesterInfo?.startDate
        ? getWeekDates(semesterInfo.startDate, currentSelectedWeek)
        : null;

    // Ensure weekOptions are generated based on the potentially updated totalWeeks
    const weekOptions = Array.from({ length: totalWeeks > 0 ? totalWeeks : 1 }, (_, i) => i + 1);


    // Ensure currentSelectedWeek is a string for the Select value, and handle null case
    const selectValue = currentSelectedWeek !== null ? currentSelectedWeek.toString() : '';

    // Disable selector if critical info is missing
    const isDisabled = !semesterInfo || !currentSelectedWeek || !totalSemesterWeeksFromStore;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2, py: 1, backgroundColor: 'background.paper', borderRadius: 1, boxShadow: 1, flexWrap: 'wrap' }}>
            <Tooltip title="上一周">
                <span>
                    <IconButton onClick={handlePreviousWeek} disabled={isDisabled || currentSelectedWeek <= 1} aria-label="上一周">
                        <ArrowBackIosNewIcon />
                    </IconButton>
                </span>
            </Tooltip>

            <FormControl sx={{ m: 1, minWidth: 130 }} size="small" disabled={isDisabled}>
                <InputLabel id="week-select-label">选择周次</InputLabel>
                <Select
                    labelId="week-select-label"
                    id="week-select"
                    value={selectValue}
                    label="选择周次"
                    onChange={handleSelectWeek}
                >
                    {weekOptions.map(weekNum => (
                        <MenuItem key={weekNum} value={weekNum.toString()}>第 {weekNum} 周</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {weekDates && semesterInfo && (
                <Typography variant="body1" sx={{ mx: 1, display: { xs: 'none', md: 'block' }, color: 'text.secondary' }}>
                    ({formatDate(weekDates.start, 'MM/dd')} - {formatDate(weekDates.end, 'MM/dd')})
                </Typography>
            )}

            <Tooltip title="下一周">
                <span>
                    <IconButton onClick={handleNextWeek} disabled={isDisabled || currentSelectedWeek >= totalWeeks} aria-label="下一周">
                        <ArrowForwardIosIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
};

export default WeekSelector;