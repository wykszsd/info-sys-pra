import React, { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form'; // Import FieldValues
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert
} from '@mui/material';
import type { Course, CoursePayload } from '../../../../types';
// --- (假设 Course 和 CoursePayload 类型定义不变) ---

// --- (类型定义结束) ---

// Zod schema (保持不变)
const courseFormSchema = z.object({
    courseCode: z.string().min(3, "课程代码至少3位").max(20, "课程代码过长"),
    courseName: z.string().min(2, "课程名称至少2位").max(100, "课程名称过长"),
    credit: z.coerce.number({ invalid_type_error: "学分必须是数字" }).int("学分必须是整数").min(0, "学分不能为负").max(15, "学分数值过大"),
    semester: z.enum(['spring', 'fall'], { required_error: "请选择开课学期" }),
    year: z.coerce.number({ invalid_type_error: "年份必须是数字" }).int("年份必须是整数").min(2020, "年份过早").max(new Date().getFullYear() + 5, "年份过远"),
    maxCapacity: z.coerce.number({ invalid_type_error: "容量必须是数字" }).int("容量必须是整数").min(1, "最大容量至少为1").max(500, "容量过大").default(50),
    prerequisitesDisplay: z.string().default(''),
});

// 推断类型 (保持不变)
type CourseFormValues = z.infer<typeof courseFormSchema>;

// 默认值常量 (保持不变，但会在 useForm 中直接使用)
const formDefaultValues: CourseFormValues = {
    courseCode: '',
    courseName: '',
    credit: 0,
    semester: 'spring',
    year: new Date().getFullYear(),
    maxCapacity: 50, // 明确是 number
    prerequisitesDisplay: '', // 明确是 string
};


interface CourseFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CoursePayload) => Promise<void>;
    initialData?: Partial<Course> | null;
    isSubmitting?: boolean;
    apiError?: string | null;
}

const CourseForm: React.FC<CourseFormProps> = ({
    open, onClose, onSubmit, initialData, isSubmitting, apiError
}) => {
    const isEditMode = !!initialData;

    // 将 defaultValues 直接传入 useForm
    const { control, handleSubmit, reset, formState: { errors }, setError } = useForm<CourseFormValues>({
        resolver: zodResolver(courseFormSchema) as unknown as Resolver<CourseFormValues>, // TS 错误仍可能发生在此处
        defaultValues: formDefaultValues, // 直接使用类型匹配的默认值对象
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                let prereqsDisplay = '';
                try {
                    const prereqs = initialData.prerequisites;
                    if (prereqs && typeof prereqs === 'string') {
                        const parsed = JSON.parse(prereqs);
                        if (Array.isArray(parsed)) prereqsDisplay = parsed.join(', ');
                    } else if (Array.isArray(prereqs)) {
                        prereqsDisplay = prereqs.join(', ');
                    }
                } catch (e) { console.error("解析 initialData.prerequisites 时出错:", initialData.prerequisites, e); }

                // reset 时确保提供的值完全符合 CourseFormValues 类型
                reset({
                    courseCode: initialData.courseCode ?? formDefaultValues.courseCode,
                    courseName: initialData.courseName ?? formDefaultValues.courseName,
                    credit: initialData.credit ?? formDefaultValues.credit,
                    semester: initialData.semester ?? formDefaultValues.semester,
                    year: initialData.year ?? formDefaultValues.year,
                    maxCapacity: initialData.maxCapacity ?? formDefaultValues.maxCapacity, // 使用 ?? 确保类型为 number
                    prerequisitesDisplay: prereqsDisplay || formDefaultValues.prerequisitesDisplay, // 使用 || 确保类型为 string
                });
            } else {
                reset(formDefaultValues); // 重置为默认值
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, open, reset, isEditMode]); // 移除 formDefaultValues，因为它现在是常量且在 hook 外定义


    useEffect(() => {
        // API 错误处理 (保持不变)
        if (apiError) {
            const gError = apiError as any;
            let handled = false;
            if (typeof apiError === 'string') {
                if (apiError.toLowerCase().includes('code') || apiError.toLowerCase().includes('代码')) {
                    setError("courseCode", { type: "server", message: apiError });
                    handled = true;
                } else if (apiError.toLowerCase().includes('name') || apiError.toLowerCase().includes('名称')) {
                    setError("courseName", { type: "server", message: apiError });
                    handled = true;
                }
            }
            if (!handled) {
                setError('root.serverError', { type: "server", message: (gError?.message || apiError || "发生未知错误") });
            }
        }
    }, [apiError, setError]);

    // 提交处理函数 (保持不变)
    const handleFormSubmitWrapper: SubmitHandler<CourseFormValues> = async (formData) => {
        const prerequisitesArray = formData.prerequisitesDisplay.split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

        const prerequisitesJsonString = prerequisitesArray.length > 0
            ? JSON.stringify(prerequisitesArray)
            : undefined;

        const payloadForApi: CoursePayload = {
            courseCode: formData.courseCode,
            courseName: formData.courseName,
            credit: formData.credit,
            semester: formData.semester,
            year: formData.year,
            maxCapacity: formData.maxCapacity, // formData.maxCapacity 是 number
            prerequisites: prerequisitesJsonString,
        };
        await onSubmit(payloadForApi);
    };

    // 明确类型 handleSubmit<CourseFormValues> 防止 TS2345 错误
    const formSubmitHandler = handleSubmit(handleFormSubmitWrapper);

    return (
        // 将明确类型的 formSubmitHandler 传递给 onSubmit
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ component: 'form', onSubmit: formSubmitHandler, noValidate: true }}>
            <DialogTitle>{isEditMode ? '编辑课程' : '新增课程'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {/* --- Grid items and Controllers (保持不变) --- */}
                    <Grid size={{ xs: 12, sm: 6 }}  >
                        <Controller name="courseCode" control={control} render={({ field }) => (
                            <TextField {...field} label="课程代码" fullWidth required error={!!errors.courseCode} helperText={errors.courseCode?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="courseName" control={control} render={({ field }) => (
                            <TextField {...field} label="课程名称" fullWidth required error={!!errors.courseName} helperText={errors.courseName?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="credit" control={control} render={({ field }) => (
                            <TextField {...field} type="number" label="学分" fullWidth required error={!!errors.credit} helperText={errors.credit?.message} disabled={isSubmitting} InputLabelProps={{ shrink: true }} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="maxCapacity" control={control} render={({ field }) => (
                            <TextField {...field} type="number" label="最大选课人数" fullWidth required error={!!errors.maxCapacity} helperText={errors.maxCapacity?.message} disabled={isSubmitting} InputLabelProps={{ shrink: true }} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="semester" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.semester} disabled={isSubmitting}>
                                <InputLabel>开课学期</InputLabel>
                                <Select {...field} label="开课学期">
                                    <MenuItem value="spring">春季</MenuItem>
                                    <MenuItem value="fall">秋季</MenuItem>
                                </Select>
                                {errors.semester && <FormHelperText>{errors.semester.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="year" control={control} render={({ field }) => (
                            <TextField {...field} type="number" label="开课年份" fullWidth required error={!!errors.year} helperText={errors.year?.message} disabled={isSubmitting} InputLabelProps={{ shrink: true }} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller name="prerequisitesDisplay" control={control} render={({ field }) => (
                            <TextField {...field} label="先修课程代码 (可选, 逗号分隔)" fullWidth error={!!errors.prerequisitesDisplay} helperText={errors.prerequisitesDisplay?.message || '例如: CS101, MA100'} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    {errors.root?.serverError && (
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="error">{(errors.root.serverError as any).message}</Alert>
                        </Grid>
                    )}
                    {/* --- Grid items end --- */}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? '更新课程' : '创建课程')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CourseForm;