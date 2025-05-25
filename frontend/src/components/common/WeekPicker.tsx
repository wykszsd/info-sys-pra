// src/components/common/WeekPicker.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Checkbox, FormControlLabel, Typography, Button, Grid, Tooltip, IconButton, FormHelperText, FormControl } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { parseWeeksStringToBoolArray, formatBoolArrayToWeeksString } from '../../utils/timetableUtils'; // Adjust path if utils are elsewhere

interface WeekPickerProps {
    totalWeeks?: number;
    value: string; // Controlled component: current weeks string e.g., "1-8,10,12-16"
    onChange: (weeksString: string) => void; // Callback to update parent state/form
    label?: string;
    error?: boolean;
    helperText?: string | React.ReactNode;
    disabled?: boolean;
}

const WeekPicker: React.FC<WeekPickerProps> = ({
    totalWeeks = 18,
    value, // Current weeks string from form state
    onChange,
    label = "选择周次",
    error,
    helperText,
    disabled = false,
}) => {
    // Internal state for checkboxes, synced with the `value` prop
    const [selectedBooleans, setSelectedBooleans] = useState<boolean[]>(() => parseWeeksStringToBoolArray(value, totalWeeks));

    // Effect to update internal boolean array when the `value` prop (weeks string) changes from outside
    useEffect(() => {
        setSelectedBooleans(parseWeeksStringToBoolArray(value, totalWeeks));
    }, [value, totalWeeks]);

    const handleWeekChange = (index: number) => {
        if (disabled) return;
        const newSelectedBooleans = [...selectedBooleans];
        newSelectedBooleans[index] = !newSelectedBooleans[index];
        setSelectedBooleans(newSelectedBooleans);
        onChange(formatBoolArrayToWeeksString(newSelectedBooleans)); // Call parent onChange with new string
    };

    const handleSelectAll = () => {
        if (disabled) return;
        const allSelected = new Array(totalWeeks).fill(true);
        setSelectedBooleans(allSelected);
        onChange(formatBoolArrayToWeeksString(allSelected));
    };

    const handleClearAll = () => {
        if (disabled) return;
        const allCleared = new Array(totalWeeks).fill(false);
        setSelectedBooleans(allCleared);
        onChange(formatBoolArrayToWeeksString(allCleared));
    };

    const handleSelectOdd = () => {
        if (disabled) return;
        const oddSelected = selectedBooleans.map((_, index) => (index + 1) % 2 !== 0);
        setSelectedBooleans(oddSelected);
        onChange(formatBoolArrayToWeeksString(oddSelected));
    };

    const handleSelectEven = () => {
        if (disabled) return;
        const evenSelected = selectedBooleans.map((_, index) => (index + 1) % 2 === 0);
        setSelectedBooleans(evenSelected);
        onChange(formatBoolArrayToWeeksString(evenSelected));
    };

    // Display the current formatted string (derived from `value` prop via `selectedBooleans`)
    const currentFormattedString = useMemo(() => formatBoolArrayToWeeksString(selectedBooleans), [selectedBooleans]);

    return (
        <FormControl error={error} disabled={disabled} fullWidth component="fieldset" variant="outlined" sx={{ p: 1.5, borderRadius: 1, border: error ? '1px solid #d32f2f' : '1px solid rgba(0, 0, 0, 0.23)', '&:hover': { borderColor: error ? '#d32f2f' : 'text.primary' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" component="legend" sx={{ mb: 0, fontSize: '1rem', color: error ? 'error.main' : 'text.primary' }}>
                    {label}
                    <Tooltip title="点击选择教学周次。可选择单周、连续周或间隔周。选定后会自动生成符合格式的周次字符串。">
                        <IconButton size="small" sx={{ ml: 0.5, color: 'text.secondary' }} aria-label="周次选择说明">
                            <InfoOutlinedIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Typography>
                <Typography variant="caption" color="textSecondary">已选: {currentFormattedString || '无'}</Typography>
            </Box>

            <Grid container spacing={0} sx={{ maxHeight: 180, overflowY: 'auto', mb: 1, borderTop: '1px solid #eee', borderBottom: '1px solid #eee', py: 1 }}>
                {selectedBooleans.map((checked, index) => (
                    <Grid size={{ xs: 4, sm: 2 }} key={index}> {/* MUI v6 Grid */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checked}
                                    onChange={() => handleWeekChange(index)}
                                    size="small"
                                    disabled={disabled}
                                />
                            }
                            label={`${index + 1}周`}
                            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' }, m: 0 }}
                        />
                    </Grid>
                ))}
            </Grid>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start', mt: 1 }}>
                <Button size="small" variant="text" onClick={handleSelectAll} disabled={disabled}>全选</Button>
                <Button size="small" variant="text" onClick={handleClearAll} disabled={disabled}>清空</Button>
                <Button size="small" variant="text" onClick={handleSelectOdd} disabled={disabled}>单周</Button>
                <Button size="small" variant="text" onClick={handleSelectEven} disabled={disabled}>双周</Button>
            </Box>
            {helperText && <FormHelperText error={error} sx={{ mt: 0.5, ml: 0 }}>{helperText}</FormHelperText>}
        </FormControl>
    );
};

export default WeekPicker;