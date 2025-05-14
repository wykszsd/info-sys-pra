import React, { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { SemesterInfo, SemesterPayload } from '../../../../types'; // Adjust path
// Adjust path
import { parseISO, startOfDay, isValid } from 'date-fns';

const currentYear = new Date().getFullYear();
const semesterSchema = z.object({
    semesterName: z.string().min(5, "学期名称至少5字符").max(50, "名称过长"),
    startDate: z.date({ required_error: "请选择开始日期" }),
    endDate: z.date({ required_error: "请选择结束日期" }),
    termType: z.enum(['spring', 'fall'], { required_error: "请选择学期类型" }),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/, "学年格式如: 2023-2024"),
    // isCurrentFromForm: z.boolean().optional(), // For potentially setting as current during creation
}).refine(data => data.endDate > data.startDate, {
    message: "结束日期必须晚于开始日期",
    path: ["endDate"],
});
type SemesterFormData = z.infer<typeof semesterSchema>;

interface SemesterFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: SemesterPayload) => Promise<void>;
    initialData?: SemesterInfo | null;
    isSubmitting?: boolean;
    apiError?: string | null;
}

const SemesterForm: React.FC<SemesterFormProps> = ({ open, onClose, onSubmit, initialData, isSubmitting, apiError }) => {
    const isEditMode = !!initialData;
    const { control, handleSubmit, reset, formState: { errors }, setError } = useForm<SemesterFormData>({
        resolver: zodResolver(semesterSchema),
        defaultValues: {
            semesterName: '', startDate: startOfDay(new Date()), endDate: startOfDay(new Date()),
            termType: 'spring', academicYear: `${currentYear}-${currentYear + 1}`
        }
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                reset({
                    semesterName: initialData.semesterName,
                    startDate: initialData.startDate && isValid(parseISO(initialData.startDate)) ? parseISO(initialData.startDate) : startOfDay(new Date()),
                    endDate: initialData.endDate && isValid(parseISO(initialData.endDate)) ? parseISO(initialData.endDate) : startOfDay(new Date()),
                    termType: initialData.termType,
                    academicYear: initialData.academicYear,
                });
            } else {
                reset({
                    semesterName: ``,
                    startDate: startOfDay(new Date()),
                    endDate: startOfDay(new Date(new Date().setMonth(new Date().getMonth() + 4))), // Default end 4 months later
                    termType: 'spring',
                    academicYear: `${currentYear}-${currentYear + 1}`
                });
            }
        }
    }, [initialData, open, reset, isEditMode]);

    useEffect(() => { if (apiError) setError("semesterName", { type: "manual", message: apiError }); }, [apiError, setError]);

    const handleFormSubmitInternal: SubmitHandler<SemesterFormData> = async (data) => {
        const payload: SemesterPayload = {
            ...data,
            startDate: data.startDate.toISOString().split('T')[0], // Format to YYYY-MM-DD
            endDate: data.endDate.toISOString().split('T')[0],
        };
        await onSubmit(payload);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ component: 'form', onSubmit: handleSubmit(handleFormSubmitInternal) }}>
            <DialogTitle>{isEditMode ? '编辑学期' : '新增学期'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={12}>
                        <Controller name="semesterName" control={control} render={({ field }) => <TextField {...field} label="学期名称" fullWidth required error={!!errors.semesterName} helperText={errors.semesterName?.message} disabled={isSubmitting} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="startDate" control={control} render={({ field }) => <DatePicker {...field} label="开始日期" slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message, disabled: isSubmitting } }} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="endDate" control={control} render={({ field }) => <DatePicker {...field} label="结束日期" slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.endDate, helperText: errors.endDate?.message, disabled: isSubmitting } }} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="termType" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.termType} disabled={isSubmitting}>
                                <InputLabel>学期类型</InputLabel>
                                <Select {...field} label="学期类型">
                                    <MenuItem value="spring">春季</MenuItem>
                                    <MenuItem value="fall">秋季</MenuItem>
                                </Select>
                                {errors.termType && <FormHelperText>{errors.termType.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="academicYear" control={control} render={({ field }) => <TextField {...field} label="学年标识 (如 2023-2024)" fullWidth required error={!!errors.academicYear} helperText={errors.academicYear?.message} disabled={isSubmitting} />} />
                    </Grid>
                    {/* Removed isCurrentFromForm checkbox, activation is a separate action */}
                    {errors.root?.serverError && <Grid size={12}><Alert severity="error">{(errors.root.serverError as any).message}</Alert></Grid>}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? '更新' : '创建')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
export default SemesterForm;