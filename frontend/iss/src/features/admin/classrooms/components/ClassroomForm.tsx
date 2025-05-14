import React, { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert
} from '@mui/material';
import type { Classroom, ClassroomPayload } from '../../../../types'; // Adjust path
// Adjust path

const classroomValidationSchema = z.object({
    building: z.string().min(1, "教学楼名称不能为空").max(50, "名称过长"),
    roomNumber: z.string().min(1, "教室编号不能为空").max(20, "编号过长"),
    capacity: z.coerce.number().int("容量必须是整数").min(1, "容量至少为1").max(1000, "容量设置过大"),
    equipment: z.enum(['basic', 'multimedia', 'lab'], { required_error: "请选择设备类型" }),
});
type ClassroomFormData = z.infer<typeof classroomValidationSchema>;

interface ClassroomFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: ClassroomPayload) => Promise<void>;
    initialData?: Classroom | null;
    isSubmitting?: boolean;
    apiError?: string | null; // To display API errors from parent
}

const ClassroomForm: React.FC<ClassroomFormProps> = ({
    open, onClose, onSubmit, initialData, isSubmitting, apiError
}) => {
    const isEditMode = !!initialData;
    const { control, handleSubmit, reset, formState: { errors }, setError } = useForm<ClassroomFormData>({
        resolver: zodResolver(classroomValidationSchema),
        defaultValues: { building: '', roomNumber: '', capacity: 30, equipment: 'basic' }
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                reset(initialData);
            } else {
                reset({ building: '', roomNumber: '', capacity: 30, equipment: 'basic' });
            }
        }
    }, [initialData, open, reset, isEditMode]);

    // Display API error back into the form if relevant
    useEffect(() => {
        if (apiError) {
            // Example: if error message contains "building" or "roomNumber"
            if (apiError.toLowerCase().includes('教室') || apiError.toLowerCase().includes('room')) {
                setError("roomNumber", { type: "manual", message: apiError });
            } else {
                setError("root.serverError", { type: "custom", message: apiError });
            }
        }
    }, [apiError, setError]);


    const handleFormSubmitInternal: SubmitHandler<ClassroomFormData> = async (data) => {
        await onSubmit(data); // Parent handles dialog closing on success
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ component: 'form', onSubmit: handleSubmit(handleFormSubmitInternal) }}>
            <DialogTitle>{isEditMode ? '编辑教室' : '新增教室'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={12}>
                        <Controller name="building" control={control} render={({ field }) => (
                            <TextField {...field} label="教学楼名称" fullWidth required error={!!errors.building} helperText={errors.building?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={12}>
                        <Controller name="roomNumber" control={control} render={({ field }) => (
                            <TextField {...field} label="教室编号" fullWidth required error={!!errors.roomNumber} helperText={errors.roomNumber?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={12}>
                        <Controller name="capacity" control={control} render={({ field }) => (
                            <TextField {...field} label="容纳人数" type="number" fullWidth required error={!!errors.capacity} helperText={errors.capacity?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={12}>
                        <Controller name="equipment" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.equipment} disabled={isSubmitting}>
                                <InputLabel>设备类型</InputLabel>
                                <Select {...field} label="设备类型">
                                    <MenuItem value="basic">基础设备</MenuItem>
                                    <MenuItem value="multimedia">多媒体教室</MenuItem>
                                    <MenuItem value="lab">实验室</MenuItem>
                                </Select>
                                {errors.equipment && <FormHelperText>{errors.equipment.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>
                    {errors.root?.serverError && <Grid size={12}><Alert severity="error">{(errors.root.serverError as any).message}</Alert></Grid>}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? '更新教室' : '创建教室')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ClassroomForm;