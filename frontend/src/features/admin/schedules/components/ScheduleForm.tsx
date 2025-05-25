// src/components/common/WeekPicker.tsx
// 无更改，保持原样

// src/features/admin/schedules/components/ScheduleForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress,
    Autocomplete, Alert as MuiAlert, Typography, Box
} from '@mui/material';
import WeekPicker from '../../../../components/common/WeekPicker'; // Adjust path
import type {
    Schedule, SchedulePayload, Course, TeacherInfo, Classroom, ClassSection // Removed SemesterInfo as it's unused
} from '../../../../types'; // Adjust path
// Adjust path

// Zod schema for ScheduleForm validation
const scheduleFormValidationSchema = z.object({
    courseId: z.number({ invalid_type_error: "请选择课程", required_error: "课程不能为空" }),
    teacherId: z.string({ required_error: "请选择授课教师" }).min(1, "授课教师不能为空"),
    classroomId: z.number({ invalid_type_error: "请选择上课教室", required_error: "教室不能为空" }),
    sectionId: z.number({ invalid_type_error: "请选择节次", required_error: "节次不能为空" }),
    weekDay: z.number({ invalid_type_error: "请选择星期", required_error: "星期不能为空" }).min(1).max(7),
    weeks: z.string()
        .min(1, "周次不能为空")
        .regex(/^((\d{1,2}(-\d{1,2})?)(,\s*\d{1,2}(-\d{1,2})?)*)$|^(\d{1,2})$/, "周次格式不正确 (示例: 1-8,10 或 5)"),
    // semesterId: z.number({ required_error: "请选择学期"}), // If form includes semester selection
});

type ScheduleFormData = z.infer<typeof scheduleFormValidationSchema>;

interface ScheduleFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: SchedulePayload) => Promise<void>; // Async submit handler
    initialData?: Schedule | null; // For editing
    isSubmitting?: boolean;
    apiFormError?: string | null; // To display API errors from parent

    // Data for dropdowns/autocomplete
    allCourses: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    allTeachers: TeacherInfo[];
    allClassrooms: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    allSections: ClassSection[];
    // allSemesters?: SemesterInfo[]; // If form includes semester selection
    isLoadingDependencies?: boolean; // True if any dropdown data is loading
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
    open, onClose, onSubmit, initialData, isSubmitting, apiFormError,
    allCourses, allTeachers, allClassrooms, allSections, isLoadingDependencies
}) => {
    const isEditMode = !!initialData;
    const { control, handleSubmit, reset, formState: { errors }, setError } = useForm<ScheduleFormData>({ // Removed setValue and watch
        resolver: zodResolver(scheduleFormValidationSchema),
        defaultValues: {
            courseId: undefined, teacherId: undefined, classroomId: undefined,
            sectionId: undefined, weekDay: undefined, weeks: '',
            // semesterId: undefined,
        }
    });

    // Removed currentSelectedWeeks as field.value from Controller is sufficient

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                reset({
                    courseId: initialData.courseId,
                    teacherId: initialData.teacherId,
                    classroomId: initialData.classroomId,
                    sectionId: initialData.sectionId,
                    weekDay: initialData.weekDay,
                    weeks: initialData.weeks,
                    // semesterId: initialData.semesterId, // If semester is part of schedule form
                });
            } else {
                reset({ // Default for create
                    courseId: undefined, teacherId: undefined, classroomId: undefined,
                    sectionId: undefined, weekDay: undefined, weeks: '',
                    // semesterId: undefined,
                });
            }
        }
    }, [initialData, open, reset, isEditMode]);

    useEffect(() => {
        if (apiFormError) {
            // Attempt to map common API errors, otherwise show a general one
            if (apiFormError.toLowerCase().includes('conflict') || apiFormError.toLowerCase().includes('冲突')) {
                setError("root.apiError", { type: "manual", message: `排课冲突: ${apiFormError}` });
            } else {
                setError("root.apiError", { type: "manual", message: apiFormError });
            }
        }
    }, [apiFormError, setError]);

    const handleFormSubmitInternal: SubmitHandler<ScheduleFormData> = async (data) => {
        const payload: SchedulePayload = { ...data };
        await onSubmit(payload);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ component: 'form', onSubmit: handleSubmit(handleFormSubmitInternal) }}>
            <DialogTitle>{isEditMode ? `编辑排课 (ID: ${initialData?.scheduleId})` : '新增排课'}</DialogTitle>
            <DialogContent>
                {isLoadingDependencies && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress size={24} />
                        <Typography sx={{ ml: 1 }}>加载选项数据...</Typography>
                    </Box>
                )}
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {/* Optional: Semester Selector if schedules are not implicitly tied to a globally selected semester */}
                    {/* <Grid item size={{ xs: 12, sm: 6 }}>
                        <Controller name="semesterId" control={control} render={({ field }) => (
                            <Autocomplete options={allSemesters || []} getOptionLabel={(o)=>o.semesterName} ... />
                        )}/>
                    </Grid> */}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="courseId" control={control} render={({ field }) => (
                            <Autocomplete
                                options={allCourses}
                                getOptionLabel={(option) => `${option.courseCode} - ${option.courseName}`}
                                value={allCourses.find(c => c.courseId === field.value) || null}
                                onChange={(_event, newValue) => field.onChange(newValue?.courseId)} // Replaced e with _event
                                isOptionEqualToValue={(option, value) => option.courseId === value?.courseId}
                                renderInput={(params) => <TextField {...params} label="选择课程" required error={!!errors.courseId} helperText={errors.courseId?.message} />}
                                disabled={isSubmitting || isLoadingDependencies || allCourses.length === 0}
                            />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="teacherId" control={control} render={({ field }) => (
                            <Autocomplete
                                options={allTeachers}
                                getOptionLabel={(option) => `${option.name} (${option.teacherId})`}
                                value={allTeachers.find(t => t.teacherId === field.value) || null}
                                onChange={(_event, newValue) => field.onChange(newValue?.teacherId)} // Replaced e with _event
                                isOptionEqualToValue={(option, value) => option.teacherId === value?.teacherId}
                                renderInput={(params) => <TextField {...params} label="选择教师" required error={!!errors.teacherId} helperText={errors.teacherId?.message} />}
                                disabled={isSubmitting || isLoadingDependencies || allTeachers.length === 0}
                            />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Controller name="classroomId" control={control} render={({ field }) => (
                            <Autocomplete
                                options={allClassrooms}
                                getOptionLabel={(option) => `${option.building} ${option.roomNumber} (容:${option.capacity})`}
                                value={allClassrooms.find(c => c.classroomId === field.value) || null}
                                onChange={(_event, newValue) => field.onChange(newValue?.classroomId)} // Replaced e with _event
                                isOptionEqualToValue={(option, value) => option.classroomId === value?.classroomId}
                                renderInput={(params) => <TextField {...params} label="选择教室" required error={!!errors.classroomId} helperText={errors.classroomId?.message} />}
                                disabled={isSubmitting || isLoadingDependencies || allClassrooms.length === 0}
                            />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Controller name="sectionId" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.sectionId} disabled={isSubmitting || isLoadingDependencies || allSections.length === 0}>
                                <InputLabel>选择节次</InputLabel>
                                <Select
                                    labelId="sectionId-select-label" // 添加 labelId，增强可访问性
                                    {...field}
                                    value={field.value === undefined ? '' : field.value} // 确保 undefined 转换为 ''
                                    label="选择节次"
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        if (typeof selectedValue === 'string' && selectedValue === '') {
                                            field.onChange(undefined); // 如果选择了空选项，设置为 undefined
                                        } else {
                                            field.onChange(Number(selectedValue)); // 否则转换为数字
                                        }
                                    }}
                                >                            <MenuItem value=""><em>请选择节次</em></MenuItem> {/* 添加空选项 */}
                                    {allSections.map(s => <MenuItem key={s.sectionId} value={s.sectionId}>{`第${s.sectionId}节 (${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)})`}</MenuItem>)}
                                </Select>
                                {errors.sectionId && <FormHelperText>{errors.sectionId.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Controller name="weekDay" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.weekDay} disabled={isSubmitting}>
                                <InputLabel>选择星期</InputLabel>
                                <Select
                                    labelId="weekDay-select-label" // 添加 labelId，增强可访问性
                                    {...field}
                                    value={field.value === undefined ? '' : field.value} // 确保 undefined 转换为 ''
                                    label="选择星期"
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        if (typeof selectedValue === 'string' && selectedValue === '') {
                                            field.onChange(undefined); // 如果选择了空选项，设置为 undefined
                                        } else {
                                            field.onChange(Number(selectedValue)); // 否则转换为数字
                                        }
                                    }}
                                >
                                    <MenuItem value=""><em>请选择星期</em></MenuItem> {/* 添加空选项 */}
                                    {[1, 2, 3, 4, 5, 6, 7].map(d => <MenuItem key={d} value={d}>{`周${['一', '二', '三', '四', '五', '六', '日'][d - 1]}`}</MenuItem>)}
                                </Select>
                                {errors.weekDay && <FormHelperText>{errors.weekDay.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>

                    <Grid size={12}>
                        <Controller
                            name="weeks"
                            control={control}
                            render={({ field }) => (
                                <WeekPicker
                                    value={field.value} // Changed from initialWeeksString to value
                                    onChange={(weeksStr) => field.onChange(weeksStr)}
                                    label="选择教学周次 *"
                                    error={!!errors.weeks}
                                    helperText={errors.weeks?.message}
                                />
                            )}
                        />
                    </Grid>
                    {errors.root?.apiError && <Grid size={12}><MuiAlert severity="error">{(errors.root.apiError as any).message}</MuiAlert></Grid>}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || isLoadingDependencies}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? '更新排课' : '创建排课')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ScheduleForm;