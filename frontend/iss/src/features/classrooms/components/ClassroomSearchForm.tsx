// src/features/classrooms/components/ClassroomSearchForm.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent, OutlinedInput, Chip, CircularProgress, FormHelperText } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { AppDispatch, RootState } from '../../../store';
import { updateClassroomQuery, findAvailableClassrooms, clearClassroomSearch } from '../store/classroomSlice';
import type { EmptyClassroomQuery, ClassSection } from '../../../types';
import { formatDateToYMD, parseISO, startOfDay, addDays, isDateRangeValid } from '../../../utils/dateUtils';
import { formatTimeString } from '../../../utils/timetableUtils';
import { differenceInDays, isBefore } from 'date-fns';

interface ClassroomSearchFormProps {
    buildings: string[];
    allTimetableSections: ClassSection[];
    isLoadingSearch: boolean;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = { PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 250, }, }, };

const ClassroomSearchForm: React.FC<ClassroomSearchFormProps> = ({ buildings, allTimetableSections, isLoadingSearch }) => {
    const dispatch: AppDispatch = useDispatch();
    const currentQuery = useSelector((state: RootState) => state.classrooms.query);

    const [localStartDate, setLocalStartDate] = useState<Date | null>(
        currentQuery.startDate ? parseISO(currentQuery.startDate) : startOfDay(new Date())
    );
    const [localEndDate, setLocalEndDate] = useState<Date | null>(
        currentQuery.endDate ? parseISO(currentQuery.endDate) : addDays(startOfDay(new Date()), 6)
    );
    const [localSectionIds, setLocalSectionIds] = useState<number[]>(currentQuery.sectionIds || []);
    const [localBuilding, setLocalBuilding] = useState<string>(currentQuery.building || '');
    const [localMinCapacity, setLocalMinCapacity] = useState<string>(currentQuery.minCapacity?.toString() || '');
    const [dateRangeError, setDateRangeError] = useState<string | null>(null);

    useEffect(() => {
        const { valid, error } = isDateRangeValid(localStartDate, localEndDate, 7);
        setDateRangeError(valid ? null : error ?? '日期范围无效');
    }, [localStartDate, localEndDate]);

    const handleSectionChange = (event: SelectChangeEvent<number[]>) => {
        const { target: { value } } = event;
        setLocalSectionIds(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
    };

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        // Error state for form validation (not just dateRangeError)
        let formHasErrors = false;
        if (dateRangeError) {
            formHasErrors = true;
            // DatePicker will show its own error via slotProps
        }
        if (localSectionIds.length === 0) {
            formHasErrors = true;
            // Error for sections will be shown via FormControl's error prop
        }
        if (!localStartDate || !localEndDate) {
            formHasErrors = true;
            // DatePicker will show its own error
        }
        if (formHasErrors) {
            // Optionally, show a general alert or rely on individual field errors
            // alert("请检查表单中的错误项。");
            return;
        }

        const queryToDispatch: EmptyClassroomQuery = {
            startDate: formatDateToYMD(localStartDate!), // Assert non-null due to check above
            endDate: formatDateToYMD(localEndDate!),   // Assert non-null
            sectionIds: localSectionIds,
            building: localBuilding || undefined,
            minCapacity: localMinCapacity ? parseInt(localMinCapacity, 10) : undefined,
        };
        dispatch(updateClassroomQuery(queryToDispatch));
        dispatch(findAvailableClassrooms(queryToDispatch));
    };

    const handleClear = () => {
        const today = startOfDay(new Date());
        setLocalStartDate(today);
        setLocalEndDate(addDays(today, 6));
        setLocalSectionIds([]);
        setLocalBuilding('');
        setLocalMinCapacity('');
        setDateRangeError(null);
        dispatch(clearClassroomSearch());
    };

    const sectionOptions = allTimetableSections.map(s => ({
        value: s.sectionId,
        label: `第 ${s.sectionId} 节 (${formatTimeString(s.startTime)}-${formatTimeString(s.endTime)})`
    }));

    return (
        <Box component="form" onSubmit={handleSearch} noValidate sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="flex-start"> {/* This is the CONTAINER */}

                {/* Each direct child of Grid container is an ITEM */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* This Grid is an ITEM */}
                    <DatePicker
                        label="开始日期"
                        value={localStartDate}
                        onChange={(newValue) => setLocalStartDate(newValue ? startOfDay(newValue) : null)}
                        minDate={startOfDay(new Date())}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                size: 'small',
                                error: !!(dateRangeError && localStartDate && isBefore(localStartDate, startOfDay(new Date()))),
                                helperText: (dateRangeError && localStartDate && isBefore(localStartDate, startOfDay(new Date()))) ? dateRangeError : ' ',
                            }
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* This Grid is an ITEM */}
                    <DatePicker
                        label="结束日期"
                        value={localEndDate}
                        onChange={(newValue) => setLocalEndDate(newValue ? startOfDay(newValue) : null)}
                        minDate={localStartDate || startOfDay(new Date())}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                size: 'small',
                                error: !!(dateRangeError && localEndDate && localStartDate && (isBefore(localEndDate, localStartDate) || differenceInDays(localEndDate, localStartDate) >= 7)),
                                helperText: (dateRangeError && localEndDate && localStartDate && (isBefore(localEndDate, localStartDate) || differenceInDays(localEndDate, localStartDate) >= 7)) ? dateRangeError : ' ',
                            }
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* This Grid is an ITEM */}
                    <FormControl fullWidth size="small" error={localSectionIds.length === 0 && (currentQuery.startDate ? true : false) /* Show error if a search was attempted with no sections */}>
                        <InputLabel id="section-select-label">选择节次 *</InputLabel>
                        <Select
                            labelId="section-select-label"
                            multiple
                            value={localSectionIds}
                            onChange={handleSectionChange}
                            input={<OutlinedInput label="选择节次 *" />}
                            renderValue={(selected: number[]) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.sort((a, b) => a - b).map((id) => {
                                        const sectionLabel = sectionOptions.find(s => s.value === id)?.label.split('(')[0].trim() || `第${id}节`;
                                        return <Chip key={id} label={sectionLabel} size="small" />;
                                    })}
                                </Box>
                            )}
                            MenuProps={MenuProps}
                        >
                            {sectionOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {(localSectionIds.length === 0 && (currentQuery.startDate ? true : false)) && <FormHelperText error>请至少选择一个节次</FormHelperText>}
                        {!(localSectionIds.length === 0 && (currentQuery.startDate ? true : false)) && <FormHelperText> </FormHelperText>}
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* This Grid is an ITEM */}
                    <FormControl fullWidth size="small">
                        <InputLabel id="building-select-label">教学楼 (可选)</InputLabel>
                        <Select
                            labelId="building-select-label"
                            value={localBuilding}
                            label="教学楼 (可选)"
                            onChange={(e) => setLocalBuilding(e.target.value)}
                        >
                            <MenuItem value=""><em>全部教学楼</em></MenuItem>
                            {buildings.map((name) => (
                                <MenuItem key={name} value={name}>{name}</MenuItem>
                            ))}
                        </Select>
                        <FormHelperText> </FormHelperText>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* This Grid is an ITEM */}
                    <TextField
                        fullWidth size="small" label="最小容量 (可选)" type="number"
                        value={localMinCapacity}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[1-9]\d*$/.test(val) || (val === '0' && val.length === 1)) {
                                setLocalMinCapacity(val);
                            } else if (val.length === 0) {
                                setLocalMinCapacity('');
                            }
                        }}
                        inputProps={{ min: 1 }}
                        helperText=" "
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', pt: { xs: 2, sm: '20px' } }}> {/* This Grid is an ITEM */}
                    <Button type="submit" variant="contained" disabled={isLoadingSearch || !!dateRangeError || localSectionIds.length === 0 || !localStartDate || !localEndDate} startIcon={isLoadingSearch ? <CircularProgress size={20} color="inherit" /> : null} >
                        查询
                    </Button>
                    <Button type="button" variant="outlined" onClick={handleClear} disabled={isLoadingSearch} >
                        清空
                    </Button>
                </Grid>
            </Grid> {/* End of Grid container */}
        </Box>
    );
};

export default ClassroomSearchForm;