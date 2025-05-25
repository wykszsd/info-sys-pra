// src/features/admin/users/components/UserForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, CircularProgress, Alert as MuiAlert
} from '@mui/material';
import type { UserDetail, UserPayload } from '../../../../types'; // 调整路径

// 1. Zod schema 定义了验证逻辑，包括判别联合
const baseUserZodSchema = z.object({
    _formMode: z.enum(['create', 'edit']), // 用于条件验证的隐藏字段
    username: z.string().min(3, "用户名/学号/工号至少3位").max(50, "用户名过长"),
    email: z.string().email({ message: "请输入有效的邮箱地址" }).optional().or(z.literal('')),
    phone: z.string().regex(/^1[3-9]\d{9}$/, { message: "请输入有效的11位手机号" }).optional().or(z.literal('')),
    role: z.enum(['student', 'teacher', 'admin']), // 基础 schema 中的判别器占位符
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    // 确保 root.serverError 可以在所有 Zod schema 成员中定义（可选）
    // 如果 root.serverError 是通用的，可以像下面这样定义：
    // root: z.object({ serverError: z.object({ type: z.string(), message: z.string() }).optional() }).optional(),
});

// 针对每个角色的 Schemas。包含其他角色字段的可选版本。
const studentZodSchema = baseUserZodSchema.extend({
    role: z.literal('student'),
    class_name: z.string().min(2, "班级名称不能为空").max(50),
    enrollment_year: z.coerce.number().int("入学年份必须是整数").min(2000, "年份过早").max(new Date().getFullYear() + 2, "年份过远"),
    department: z.string().optional(), // 教师字段，对学生可选
    title: z.string().optional(),       // 教师字段，对学生可选
});

const teacherZodSchema = baseUserZodSchema.extend({
    role: z.literal('teacher'),
    department: z.string().min(2, "所属院系不能为空").max(100),
    title: z.string().min(2, "职称不能为空").max(50),
    class_name: z.string().optional(),  // 学生字段，对教师可选
    enrollment_year: z.coerce.number().optional(), // 学生字段，对教师可选
});

const adminZodSchema = baseUserZodSchema.extend({
    role: z.literal('admin'),
    class_name: z.string().optional(),
    enrollment_year: z.coerce.number().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
});

const userFormValidationSchema = z.discriminatedUnion("role", [
    studentZodSchema,
    teacherZodSchema,
    adminZodSchema,
])
    .refine((data) => {
        if (data.password || data.confirmPassword) {
            return data.password === data.confirmPassword;
        }
        return true;
    }, {
        message: "两次输入的密码不一致",
        path: ["confirmPassword"],
    })
    .refine((data) => {
        if (data._formMode === 'create') {
            return data.password && data.password.length >= 6;
        }
        if (data._formMode === 'edit' && data.password) {
            return data.password.length >= 6;
        }
        return true;
    }, {
        message: "创建时密码至少6位。更新时若提供新密码，也至少6位。",
        path: ["password"],
    });

// 2. 这是 Zod 解析后推断出的类型。这将是 useForm 的 TFieldValues。
type ValidatedUserFormData = z.infer<typeof userFormValidationSchema>;

// 为 root.serverError 定义一个更具体的类型，如果它在 Zod schema 中定义了
// 例如: type FormErrors = FieldErrors<ValidatedUserFormData> & { root?: { serverError?: { message?: string }}};
// 然后在 JSX 中使用 errors as FormErrors

interface UserFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UserPayload) => Promise<void>;
    initialData?: UserDetail | null;
    isSubmitting?: boolean;
    apiError?: string | null;
}

const UserForm: React.FC<UserFormProps> = ({
    open, onClose, onSubmit, initialData, isSubmitting, apiError
}) => {
    const isEditMode = !!initialData;

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors },
        getValues // <--- 从 useForm 中解构 getValues
    } = useForm<ValidatedUserFormData>({
        resolver: zodResolver(userFormValidationSchema),
        defaultValues: {
            _formMode: 'create',
            username: '',
            email: '',
            phone: '',
            role: 'student',
            password: '',
            confirmPassword: '',
            class_name: '',
            enrollment_year: new Date().getFullYear(),
            department: '',
            title: '',
            // root: { serverError: undefined } // 如果在 Zod 中定义了 root
        }
    });

    const selectedRole = watch("role");

    useEffect(() => {
        if (open) {
            const mode = initialData ? 'edit' : 'create';
            if (initialData) {
                const commonData: Partial<ValidatedUserFormData> = {
                    _formMode: mode,
                    username: initialData.username,
                    email: initialData.email || '',
                    phone: initialData.phone || '',
                    role: initialData.role,
                    password: '',
                    confirmPassword: '',
                };

                let roleSpecificData: Partial<ValidatedUserFormData> = {};
                if (initialData.role === 'student') {
                    roleSpecificData = {
                        class_name: initialData.class_name || '',
                        enrollment_year: initialData.enrollment_year || new Date().getFullYear(),
                        department: initialData.department || '',
                        title: initialData.title || '',
                    };
                } else if (initialData.role === 'teacher') {
                    roleSpecificData = {
                        department: initialData.department || '',
                        title: initialData.title || '',
                        class_name: initialData.class_name || '',
                        enrollment_year: initialData.enrollment_year !== undefined && initialData.enrollment_year !== null ? initialData.enrollment_year : undefined,
                    };
                } else { // admin
                    roleSpecificData = {
                        class_name: initialData.class_name || '',
                        enrollment_year: initialData.enrollment_year !== undefined && initialData.enrollment_year !== null ? initialData.enrollment_year : undefined,
                        department: initialData.department || '',
                        title: initialData.title || '',
                    };
                }
                reset({ ...commonData, ...roleSpecificData } as ValidatedUserFormData);
            } else {
                reset({
                    _formMode: mode,
                    username: '', email: '', phone: '', role: 'student',
                    password: '', confirmPassword: '',
                    class_name: '', enrollment_year: new Date().getFullYear(),
                    department: '', title: '',
                    // root: { serverError: undefined } // 如果在 Zod 中定义了 root
                });
            }
        }
    }, [initialData, open, reset]);

    useEffect(() => {
        if (apiError) {
            if (apiError.toLowerCase().includes('username') || apiError.toLowerCase().includes('用户名')) {
                setError("username", { type: "server", message: apiError });
            } else {
                // 为了更类型安全地设置 root 错误，确保 root 在 Zod schema 中有定义
                // 或者使用 setError('root.serverError' as any, ...) 如果不想修改 Zod schema
                setError("root.serverError" as `root.serverError`, { type: "server", message: apiError });
            }
        }
    }, [apiError, setError]);

    const handleFormSubmitInternal: SubmitHandler<ValidatedUserFormData> = async (validatedData) => {
        const payload: UserPayload = {
            username: validatedData.username,
            email: validatedData.email,
            phone: validatedData.phone,
            role: validatedData.role,
        };

        if (validatedData.password) {
            payload.password = validatedData.password;
        }

        if (validatedData.role === 'student') {
            payload.class_name = validatedData.class_name;
            payload.enrollment_year = validatedData.enrollment_year;
        } else if (validatedData.role === 'teacher') {
            payload.department = validatedData.department;
            payload.title = validatedData.title;
        }

        console.log("提交经过验证的用户 Payload:", payload);
        await onSubmit(payload);
    };

    // 辅助函数或类型守卫来帮助 TypeScript 推断 errors 类型
    const getFieldError = <T extends keyof ValidatedUserFormData>(fieldName: T) => {
        // This is a simplified example; real-world might need more robust type guarding
        // based on selectedRole for role-specific fields.
        return errors[fieldName]?.message as string | undefined;
    };


    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ component: 'form', onSubmit: handleSubmit(handleFormSubmitInternal) }}>
            <DialogTitle>{isEditMode ? `编辑用户: ${initialData?.username}` : '新增用户'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }} >
                        <Controller name="username" control={control} render={({ field }) => (
                            <TextField {...field} label="用户名 (学号/工号)" fullWidth required error={!!errors.username} helperText={errors.username?.message} disabled={isSubmitting || isEditMode} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="role" control={control} render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.role} disabled={isSubmitting || isEditMode}>
                                <InputLabel>角色</InputLabel>
                                <Select {...field} label="角色" >
                                    <MenuItem value="student">学生</MenuItem>
                                    <MenuItem value="teacher">教师</MenuItem>
                                    <MenuItem value="admin">管理员</MenuItem>
                                </Select>
                                {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
                            </FormControl>
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="email" control={control} render={({ field }) => (
                            <TextField {...field} label="邮箱 (可选)" type="email" fullWidth error={!!errors.email} helperText={errors.email?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="phone" control={control} render={({ field }) => (
                            <TextField {...field} label="手机号 (可选)" fullWidth error={!!errors.phone} helperText={errors.phone?.message} disabled={isSubmitting} />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="password" control={control} render={({ field }) => (
                            <TextField
                                {...field}
                                label={isEditMode ? "新密码 (留空则不修改)" : "初始密码"}
                                type="password"
                                fullWidth
                                // 使用解构出来的 getValues
                                required={!isEditMode && getValues('_formMode') === 'create'}
                                error={!!errors.password}
                                helperText={errors.password?.message}
                                disabled={isSubmitting}
                            />
                        )} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller name="confirmPassword" control={control} render={({ field }) => (
                            <TextField
                                {...field}
                                label="确认密码"
                                type="password"
                                fullWidth
                                required={!!watch('password')} // 保持不变，watch('password') 是正确的
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                                disabled={isSubmitting || !watch('password')}
                            />
                        )} />
                    </Grid>

                    {selectedRole === 'student' && (
                        <>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller name="class_name" control={control} render={({ field }) => (
                                    <TextField {...field} label="班级名称" fullWidth required={selectedRole === 'student'} error={!!getFieldError('class_name')} helperText={getFieldError('class_name')} disabled={isSubmitting} />
                                )} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller name="enrollment_year" control={control} render={({ field }) => (
                                    <TextField {...field} label="入学年份" type="number" fullWidth required={selectedRole === 'student'} error={!!getFieldError('enrollment_year')} helperText={getFieldError('enrollment_year')} disabled={isSubmitting} />
                                )} />
                            </Grid>
                        </>
                    )}
                    {selectedRole === 'teacher' && (
                        <>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller name="department" control={control} render={({ field }) => (
                                    <TextField {...field} label="所属院系" fullWidth required={selectedRole === 'teacher'} error={!!getFieldError('department')} helperText={getFieldError('department')} disabled={isSubmitting} />
                                )} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller name="title" control={control} render={({ field }) => (
                                    <TextField {...field} label="职称" fullWidth required={selectedRole === 'teacher'} error={!!getFieldError('title')} helperText={getFieldError('title')} disabled={isSubmitting} />
                                )} />
                            </Grid>
                        </>
                    )}
                    {/*
                      对于 errors.root?.serverError，确保 root 在 ValidatedUserFormData 的所有成员中是可选的，
                      或者使用类型断言 errors as any。
                      如果 root 在 baseUserZodSchema 中定义为可选，则可以直接访问。
                    */}
                    {(errors as any).root?.serverError && (
                        <Grid size={{ xs: 12 }}>
                            <MuiAlert severity="error">{(errors as any).root.serverError.message}</MuiAlert>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? '更新用户' : '创建用户')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
export default UserForm;