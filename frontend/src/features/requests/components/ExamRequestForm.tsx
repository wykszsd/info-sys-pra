// src/features/requests/components/ExamRequestForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Autocomplete, FormHelperText } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Course, ClassSection, Classroom, ExamRequestPayload, Schedule } from '../../../types'; // Adjust path
// Adjust path
import { formatDate, parseISO, startOfDay } from '../../../utils/dateUtils'; // Adjust path


const examRequestSchema = z.object({
    courseId: z.number({ required_error: "请选择课程" }),
    examType: z.enum(['midterm', 'final', 'makeup'], { required_error: "请选择考试类型" }),
    proposedDate: z.date({ required_error: "请选择考试日期" }).min(startOfDay(new Date()), "考试日期不能早于今天"),
    proposedSectionId: z.number({ required_error: "请选择考试节次" }),
    proposedClassroomId: z.number({ required_error: "请选择考场" }),
    proposedDuration: z.coerce.number().int().min(30, "考试时长至少30分钟").max(240, "考试时长过长"),
    reason: z.string().min(5, "申请原因至少5个字符").max(500),
});
type ExamRequestFormData = z.infer<typeof examRequestSchema>;

interface ExamRequestFormProps {
    teacherSchedules: Schedule[]; // Used to derive courses taught by teacher
    allTimetableSections: ClassSection[];
    allClassroomsList: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    onSubmitRequest: (data: ExamRequestPayload) => Promise<void>;
    isSubmitting: boolean;
    initialData?: Partial<ExamRequestFormData>;
}

const ExamRequestForm: React.FC<ExamRequestFormProps> = ({
    teacherSchedules, allTimetableSections, allClassroomsList, onSubmitRequest, isSubmitting, initialData
}) => {
    const { control, handleSubmit, reset, formState: { errors } } = useForm<ExamRequestFormData>({
        resolver: zodResolver(examRequestSchema),
        defaultValues: initialData || {
            courseId: undefined, examType: 'final', proposedDate: startOfDay(new Date()),
            proposedSectionId: undefined, proposedClassroomId: undefined, proposedDuration: 120, reason: ''
        }
    });

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                proposedDate: initialData.proposedDate ? parseISO(initialData.proposedDate as unknown as string) : startOfDay(new Date())
            });
        } else {
            reset({
                courseId: undefined,
                examType: 'final',
                proposedDate: startOfDay(new Date()),
                proposedSectionId: undefined,
                proposedClassroomId: undefined,
                proposedDuration: 120,
                reason: ''
            });
        }
    }, [initialData, reset]);

    // Derive unique courses taught by the teacher from their schedules
    const uniqueTeacherCourses = React.useMemo(() => {
        const coursesMap = new Map<number, Pick<Course, 'courseId' | 'courseName' | 'courseCode'>>();
        teacherSchedules.forEach(s => {
            if (s.courseId && !coursesMap.has(s.courseId)) {
                coursesMap.set(s.courseId, {
                    courseId: s.courseId,
                    courseName: s.courseName || `课程ID ${s.courseId}`,
                    courseCode: s.courseCode || 'N/A'
                });
            }
        });
        return Array.from(coursesMap.values());
    }, [teacherSchedules]);

    const handleFormSubmit = async (data: ExamRequestFormData) => {
        const payload: ExamRequestPayload = {
            ...data,
            proposedDate: formatDate(data.proposedDate), // Format Date object to string
        };
        await onSubmitRequest(payload);
    };

    return (
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}> {/* 修正: Grid item props */}
                    <Controller name="courseId" control={control} render={({ field }) => (
                        <Autocomplete
                            options={uniqueTeacherCourses}
                            getOptionLabel={(option) => `${option.courseCode} - ${option.courseName}`}
                            value={uniqueTeacherCourses.find(c => c.courseId === field.value) || null}
                            onChange={(_e, newValue) => field.onChange(newValue?.courseId)}
                            isOptionEqualToValue={(option, value) => option.courseId === value.courseId}
                            renderInput={(params) => <TextField {...params} label="选择课程" required error={!!errors.courseId} helperText={errors.courseId?.message} />}
                            disabled={isSubmitting || uniqueTeacherCourses.length === 0}
                        />
                    )} />
                    {uniqueTeacherCourses.length === 0 && <FormHelperText>您的课程安排加载中或暂无课程...</FormHelperText>}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}> {/* 修正: Grid item props */}
                    <Controller name="examType" control={control} render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.examType} size="small">
                            <InputLabel>考试类型</InputLabel>
                            <Select
                                {...field}
                                value={field.value ?? ''} // 修正: 处理 undefined, null 值
                                label="考试类型"
                            >
                                <MenuItem value="midterm">期中</MenuItem>
                                <MenuItem value="final">期末</MenuItem>
                                <MenuItem value="makeup">补考</MenuItem>
                            </Select>
                            {errors.examType && <FormHelperText error>{errors.examType.message}</FormHelperText>}
                        </FormControl>
                    )} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* 修正: Grid item props */}
                    <Controller name="proposedDate" control={control} render={({ field }) => (
                        <DatePicker
                            {...field}
                            label="建议考试日期"
                            minDate={startOfDay(new Date())}
                            slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.proposedDate, helperText: errors.proposedDate?.message, size: 'small' } }}
                        />
                    )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* 修正: Grid item props */}
                    <Controller name="proposedSectionId" control={control} render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.proposedSectionId} size="small">
                            <InputLabel>建议考试节次</InputLabel>
                            <Select
                                {...field}
                                value={field.value ?? ''} // 修正: 处理 undefined, null 值
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    // 如果选择了空选项，则将其值设置为 undefined
                                    if (typeof selectedValue === 'string' && selectedValue === '') {
                                        field.onChange(undefined);
                                    } else {
                                        field.onChange(Number(selectedValue));
                                    }
                                }}
                                label="建议考试节次"
                            >
                                <MenuItem value=""><em>请选择节次</em></MenuItem> {/* 添加空选项 */}
                                {allTimetableSections.map(s => <MenuItem key={s.sectionId} value={s.sectionId}>{`第${s.sectionId}节 (${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)})`}</MenuItem>)}
                            </Select>
                            {errors.proposedSectionId && <FormHelperText error>{errors.proposedSectionId.message}</FormHelperText>}
                        </FormControl>
                    )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* 修正: Grid item props */}
                    <Controller name="proposedClassroomId" control={control} render={({ field }) => (
                        <Autocomplete
                            options={allClassroomsList}
                            getOptionLabel={(option) => `${option.building} ${option.roomNumber} (容:${option.capacity})`}
                            value={allClassroomsList.find(c => c.classroomId === field.value) || null}
                            onChange={(_e, newValue) => field.onChange(newValue?.classroomId)}
                            isOptionEqualToValue={(option, value) => option.classroomId === value.classroomId}
                            renderInput={(params) => <TextField {...params} label="建议考场" required error={!!errors.proposedClassroomId} helperText={errors.proposedClassroomId?.message || (allClassroomsList.length === 0 ? "教室加载中..." : "")} size="small" />}
                            disabled={isSubmitting || allClassroomsList.length === 0}
                        />
                    )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} > {/* 修正: Grid item props */}
                    <Controller name="proposedDuration" control={control} render={({ field }) => (
                        <TextField {...field} label="建议时长 (分钟)" type="number" fullWidth required error={!!errors.proposedDuration} helperText={errors.proposedDuration?.message} size="small" />
                    )} />
                </Grid>

                <Grid size={{ xs: 12 }}> {/* 修正: Grid item props */}
                    <Controller name="reason" control={control} render={({ field }) => (
                        <TextField
                            {...field}
                            label="申请原因/备注"
                            fullWidth required multiline rows={3}
                            error={!!errors.reason} helperText={errors.reason?.message}
                            disabled={isSubmitting}
                        />
                    )} />
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ textAlign: 'right' }}> {/* 修正: Grid item props */}
                    <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}>
                        提交考试安排申请
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ExamRequestForm;