// src/features/requests/components/ScheduleChangeRequestForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Typography, Autocomplete, FormHelperText } from '@mui/material';
import WeekPicker from '../../../components/common/WeekPicker';
import type { Schedule, ClassSection, Classroom, ScheduleChangeRequestPayload } from '../../../types';

const scheduleChangeSchema = z.object({
    originalScheduleId: z.number({ required_error: "请选择要调课的原始课程" }).positive("请选择要调课的原始课程"),
    proposedSectionId: z.number({ required_error: "请选择新节次" }).positive("请选择新节次"),
    proposedWeekDay: z.number({ required_error: "请选择新星期" }).min(1, "星期无效").max(7, "星期无效"),
    proposedWeeks: z.string().min(1, "请选择或输入新周次")
        .regex(/^((\d{1,2}(-\d{1,2})?)(,\s*\d{1,2}(-\d{1,2})?)*)$|^(\d{1,2})$/, "周次格式不正确 (e.g., 1-8,10 或 5)"),
    proposedClassroomId: z.number({ required_error: "请选择新教室" }).positive("请选择新教室"),
    reason: z.string().min(5, "调课原因至少5个字符").max(500, "原因过长"),
});
type ScheduleChangeFormData = z.infer<typeof scheduleChangeSchema>;

interface ScheduleChangeRequestFormProps {
    teacherSchedules: Schedule[];
    allTimetableSections: ClassSection[];
    allClassroomsList: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    onSubmitRequest: (data: ScheduleChangeRequestPayload) => Promise<void>;
    isSubmitting: boolean;
    initialData?: Partial<ScheduleChangeFormData>;
}

const formatScheduleOptionLabel = (s: Schedule): string => {
    if (!s) return '';
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const weekDayStr = s.weekDay && s.weekDay >= 1 && s.weekDay <= 7 ? `周${days[s.weekDay - 1]}` : '日期未知';
    const sectionStr = s.sectionId ? `第${s.sectionId}节` : '节次未知';
    const locationStr = s.building && s.roomNumber ? `(${s.building}${s.roomNumber})` : '(地点未知)';
    const weeksStr = s.weeks ? `[周次: ${s.weeks}]` : '[周次未知]';
    return `${s.courseName || '未知课程'} (${s.courseCode || 'N/A'}) - ${weekDayStr} ${sectionStr} ${locationStr} ${weeksStr}`;
};

const ScheduleChangeRequestForm: React.FC<ScheduleChangeRequestFormProps> = ({
    teacherSchedules, allTimetableSections, allClassroomsList, onSubmitRequest, isSubmitting, initialData
}) => {
    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ScheduleChangeFormData>({
        resolver: zodResolver(scheduleChangeSchema),
        defaultValues: initialData || {
            originalScheduleId: undefined,
            proposedSectionId: undefined,
            proposedWeekDay: undefined,
            proposedWeeks: '',
            proposedClassroomId: undefined,
            reason: ''
        }
    });

    useEffect(() => {
        if (initialData) reset(initialData);
        else reset({ originalScheduleId: undefined, proposedSectionId: undefined, proposedWeekDay: undefined, proposedWeeks: '', proposedClassroomId: undefined, reason: '' });
    }, [initialData, reset]);

    const handleFormSubmit = async (data: ScheduleChangeFormData) => {
        const payload: ScheduleChangeRequestPayload = { ...data };
        await onSubmitRequest(payload);
    };

    return (
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate sx={{ mt: 1 }}>
            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }}> {/* 使用 item prop 和直接的断点 prop */}
                    <Controller name="originalScheduleId" control={control} render={({ field }) => (
                        <Autocomplete
                            options={teacherSchedules}
                            getOptionLabel={formatScheduleOptionLabel}
                            value={teacherSchedules.find(s => s.scheduleId === field.value) || null}
                            onChange={(_e, newValue) => {
                                field.onChange(newValue?.scheduleId);
                                if (newValue) {
                                    setValue("proposedSectionId", newValue.sectionId, { shouldValidate: true });
                                    setValue("proposedWeekDay", newValue.weekDay, { shouldValidate: true });
                                    setValue("proposedWeeks", newValue.weeks || '', { shouldValidate: true });
                                    setValue("proposedClassroomId", newValue.classroomId, { shouldValidate: true });
                                } else {
                                    // TS2345 Fix: Cast undefined to any for setValue when field type is strictly number
                                    setValue("proposedSectionId", undefined as any, { shouldValidate: true });
                                    setValue("proposedWeekDay", undefined as any, { shouldValidate: true });
                                    setValue("proposedWeeks", '', { shouldValidate: true });
                                    setValue("proposedClassroomId", undefined as any, { shouldValidate: true });
                                }
                            }}
                            isOptionEqualToValue={(option, value) => option.scheduleId === value.scheduleId}
                            renderInput={(params) => <TextField {...params} label="选择要调课的原始课程安排" required error={!!errors.originalScheduleId} helperText={errors.originalScheduleId?.message} />}
                            disabled={isSubmitting || teacherSchedules.length === 0}
                        />
                    )} />
                    {teacherSchedules.length === 0 && !isSubmitting && <FormHelperText sx={{ ml: 1 }}>您的课程安排加载中或暂无安排...</FormHelperText>}
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ mt: 2, mb: 1 }}><Typography variant="subtitle1" fontWeight="medium" gutterBottom>申请调整为：</Typography></Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Controller name="proposedSectionId" control={control} render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.proposedSectionId} size="small" disabled={isSubmitting}>
                            <InputLabel id="proposedSectionId-change-label">新节次</InputLabel>
                            <Select
                                labelId="proposedSectionId-change-label"
                                {...field}
                                value={field.value === undefined ? '' : field.value}
                                label="新节次"
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    // TS2367 Fix: Check if selectedValue is a string before comparing with ''
                                    if (typeof selectedValue === 'string' && selectedValue === '') {
                                        field.onChange(undefined);
                                    } else {
                                        field.onChange(Number(selectedValue));
                                    }
                                }}
                            >
                                <MenuItem value=""><em>请选择节次</em></MenuItem>
                                {allTimetableSections.map(s => <MenuItem key={s.sectionId} value={s.sectionId}>{`第${s.sectionId}节 (${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)})`}</MenuItem>)}
                            </Select>
                            {errors.proposedSectionId && <FormHelperText error>{errors.proposedSectionId.message}</FormHelperText>}
                        </FormControl>
                    )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Controller name="proposedWeekDay" control={control} render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.proposedWeekDay} size="small" disabled={isSubmitting}>
                            <InputLabel id="proposedWeekDay-change-label">新星期</InputLabel>
                            <Select
                                labelId="proposedWeekDay-change-label"
                                {...field}
                                value={field.value === undefined ? '' : field.value}
                                label="新星期"
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    // Applying consistent fix pattern, though not explicitly reported for this instance by the provided errors
                                    if (typeof selectedValue === 'string' && selectedValue === '') {
                                        field.onChange(undefined);
                                    } else {
                                        field.onChange(Number(selectedValue));
                                    }
                                }}
                            >
                                <MenuItem value=""><em>请选择星期</em></MenuItem>
                                {[1, 2, 3, 4, 5, 6, 7].map(d => <MenuItem key={d} value={d}>{`周${['一', '二', '三', '四', '五', '六', '日'][d - 1]}`}</MenuItem>)}
                            </Select>
                            {errors.proposedWeekDay && <FormHelperText error>{errors.proposedWeekDay.message}</FormHelperText>}
                        </FormControl>
                    )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Controller name="proposedClassroomId" control={control} render={({ field }) => (
                        <Autocomplete
                            options={allClassroomsList}
                            getOptionLabel={(option) => `${option.building} ${option.roomNumber} (容:${option.capacity})`}
                            value={allClassroomsList.find(c => c.classroomId === field.value) || null}
                            onChange={(_e, newValue) => field.onChange(newValue?.classroomId)}
                            isOptionEqualToValue={(option, value) => option.classroomId === value.classroomId}
                            renderInput={(params) => <TextField {...params} label="新教室" required error={!!errors.proposedClassroomId} helperText={errors.proposedClassroomId?.message || (allClassroomsList.length === 0 ? "教室列表加载中..." : "")} size="small" />}
                            disabled={isSubmitting || allClassroomsList.length === 0}
                        />
                    )} />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Controller name="proposedWeeks" control={control} render={({ field }) => (
                        <WeekPicker
                            value={field.value}
                            onChange={(weeksStr) => field.onChange(weeksStr)}
                            label="新教学周次 *"
                            error={!!errors.proposedWeeks}
                            helperText={errors.proposedWeeks?.message}
                            disabled={isSubmitting}
                        />
                    )} />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Controller name="reason" control={control} render={({ field }) => (
                        <TextField
                            {...field}
                            label="调课原因"
                            fullWidth required multiline rows={3}
                            error={!!errors.reason} helperText={errors.reason?.message}
                            disabled={isSubmitting}
                        />
                    )} />
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ textAlign: 'right', mt: 2 }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}>
                        提交调课申请
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ScheduleChangeRequestForm;