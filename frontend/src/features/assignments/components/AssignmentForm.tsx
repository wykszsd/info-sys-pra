// src/features/assignments/components/AssignmentForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Typography, FormHelperText } from '@mui/material';
import { styled } from '@mui/system'; // 或 @mui/material/styles
import type { AssignmentPayload, Course } from '../../../types';
import { TextareaAutosize as MuiTextareaAutosize } from '@mui/material'; // 如果你决定继续使用它

// 如果你想用MUI官方推荐的TextareaAutosize，它不再直接从@mui/material导出
// 而是从 @mui/base/TextareaAutosize，然后你需要自己添加样式
// 或者简单地使用 TextField multiline
// 为简单起见，如果 MuiTextareaAutosize 仍然可用，我们先用着，否则考虑 TextField multiline

const StyledTextarea = styled(MuiTextareaAutosize)( // 确保这个导入和用法与你的MUI版本兼容
    ({ theme }) => ` // theme 可以从 props 中解构，如果 styled 来自 @mui/material/styles
  width: 100%;
  font-family: inherit;
  font-size: 1rem;
  padding: 8.5px 14px; // 模仿 TextField 的 padding
  border-radius: ${theme.shape?.borderRadius || 4}px; // 使用 theme 的 borderRadius
  border: 1px solid ${theme.palette?.mode === 'dark' ? theme.palette?.grey[700] : theme.palette?.grey[400]};
  &:hover {
    border-color: ${theme.palette?.text?.primary};
  }
  &:focus {
    outline: none;
    border-color: ${theme.palette?.primary?.main};
    box-shadow: 0 0 0 1px ${theme.palette?.primary?.main};
  }
  &::placeholder {
    color: ${theme.palette?.text?.disabled};
  }
  // 处理 disabled 状态
  &:disabled {
    background-color: ${theme.palette?.action?.disabledBackground};
    color: ${theme.palette?.text?.disabled};
    border-color: ${theme.palette?.action?.disabled};
  }
`,
);


const assignmentSchema = z.object({
    title: z.string().min(3, "标题至少3个字符").max(100, "标题过长"),
    content: z.string().min(10, "内容至少10个字符").max(2000, "内容过长"),
    courseId: z.number({ invalid_type_error: "请选择一个有效的课程", required_error: "请选择目标课程" }).positive("请选择目标课程"),
});
type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
    teacherCoursesForDropdown: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    onSubmitAssignment: (data: AssignmentPayload) => Promise<void>;
    isSubmitting: boolean;
    isLoadingCourses: boolean;
    initialData?: Partial<AssignmentFormData>;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
    teacherCoursesForDropdown, onSubmitAssignment, isSubmitting, isLoadingCourses, initialData
}) => {
    const { control, handleSubmit, reset, formState: { errors } } = useForm<AssignmentFormData>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: initialData || { title: '', content: '', courseId: undefined }
    });

    useEffect(() => {
        if (initialData) {
            reset(initialData);
        } else {
            reset({ title: '', content: '', courseId: undefined });
        }
    }, [initialData, reset]);

    const handleFormSubmit = async (data: AssignmentFormData) => {
        const payload: AssignmentPayload = {
            title: data.title,
            content: data.content,
            courseId: data.courseId,
        };
        await onSubmitAssignment(payload);
        // Parent (AssignmentPage) handles snackbar. Form reset on success is also handled by parent if desired, or here.
        // 如果希望在这里重置，可以在成功后调用 reset()
        // reset({ title: '', content: '', courseId: undefined });
    };

    return (
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate sx={{ mt: 1 }}>
            <Grid container spacing={2.5}> {/* 使用MUI Grid的spacing */}
                <Grid size={{ xs: 12 }}> {/* Grid xs={12} 表示在所有屏幕尺寸下占据12列 */}
                    <Controller name="title" control={control} render={({ field }) => (
                        <TextField {...field} label="通知标题" fullWidth required error={!!errors.title} helperText={errors.title?.message} disabled={isSubmitting} />
                    )} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth error={!!errors.content}> {/* Removed 'required' from FormControl as TextField has it */}
                        <Typography
                            component="label" // Use component="label" for accessibility with StyledTextarea
                            htmlFor="assignment-content-textarea" // Link to textarea id
                            gutterBottom
                            sx={{
                                mb: 0.5,
                                fontSize: '0.8rem',
                                color: errors.content ? 'error.main' : 'text.secondary',
                                display: 'block' // Ensure it behaves like a block label
                            }}
                        >
                            作业内容/通知详情 *
                        </Typography>
                        <Controller
                            name="content"
                            control={control}
                            render={({ field }) => (
                                // 如果 StyledTextarea 样式不理想或与MUI主题不符，可以换回 TextField multiline
                                // <TextField
                                //   {...field}
                                //   id="assignment-content-textarea"
                                //   label="" // Label由上面的Typography提供
                                //   multiline
                                //   rows={6}
                                //   placeholder="输入作业内容、要求、截止日期等..."
                                //   fullWidth
                                //   error={!!errors.content}
                                //   // helperText={errors.content?.message} // HelperText由下面的FormHelperText提供
                                //   disabled={isSubmitting}
                                // />
                                <StyledTextarea
                                    id="assignment-content-textarea" // Add id for label linking
                                    minRows={6}
                                    placeholder="输入作业内容、要求、截止日期等..."
                                    {...field}
                                    disabled={isSubmitting}
                                    style={errors.content ? { borderColor: 'red' } : {}} // Basic error styling
                                />
                            )}
                        />
                        {errors.content && <FormHelperText error>{errors.content.message}</FormHelperText>}
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8, md: 6 }}>
                    <Controller
                        name="courseId"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth required error={!!errors.courseId} size="small" disabled={isLoadingCourses || isSubmitting}>
                                <InputLabel id="courseId-select-label">目标课程</InputLabel>
                                <Select
                                    labelId="courseId-select-label"
                                    {...field}
                                    value={field.value === undefined ? '' : field.value} // 避免MUI对undefined值的警告
                                    label="目标课程" // 与InputLabel内容匹配
                                    onChange={(e) => {
                                        const eventValue = e.target.value;
                                        // MenuItem 的 value 是 number (course.courseId)
                                        // Select 的 e.target.value 也会是 number (或空字符串)
                                        if (typeof eventValue === 'string' && eventValue === '') {
                                            field.onChange(undefined); // 用户选择了 "请选择课程"
                                        } else if (typeof eventValue === 'number') {
                                            field.onChange(eventValue); // 用户选择了实际课程 (已经是 number)
                                        } else {
                                            // 这种 fallback 理论上不应该被触发，因为 MenuItem 的 value 要么是 '' 要么是 number
                                            // 但为了健壮性，如果 eventValue 是一个可以转为数字的字符串 (比如 "123")
                                            const numericValue = Number(eventValue); // 尝试转换以防万一
                                            if (!isNaN(numericValue) && String(eventValue).trim() !== '') { // 确保不是空字符串转换的0
                                                field.onChange(numericValue);
                                            } else {
                                                field.onChange(undefined); // 无法识别，则设为 undefined
                                            }
                                        }
                                    }}
                                >
                                    {/* 占位符 MenuItem，当 Select 的 value 是 '' 时显示 */}
                                    <MenuItem value="">
                                        <em>请选择课程</em>
                                    </MenuItem>

                                    {/* 在加载时，如果Select的value是''，上面的"请选择课程"会显示。如果希望显示加载中，需要更复杂的逻辑或 Select 的 value 对应一个加载中的 MenuItem value */}
                                    {/* {isLoadingCourses && teacherCoursesForDropdown.length === 0 && (
                                        <MenuItem value="" disabled><em>加载课程中...</em></MenuItem> 
                                    )} */}
                                    {/* 列表为空的提示，仅在未加载且列表确实为空时显示。如果Select的value是''，也会显示上面的"请选择课程" */}
                                    {/* {!isLoadingCourses && teacherCoursesForDropdown.length === 0 && (
                                        <MenuItem value="" disabled><em>课程列表为空</em></MenuItem>
                                    )} */}

                                    {teacherCoursesForDropdown.map(course => (
                                        <MenuItem key={course.courseId} value={course.courseId}>
                                            {course.courseName} ({course.courseCode})
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.courseId && <FormHelperText error>{errors.courseId.message}</FormHelperText>}
                                {isLoadingCourses && teacherCoursesForDropdown.length === 0 && (
                                    <Typography variant="caption" sx={{ pl: 2, pt: 0.5, color: 'text.secondary' }}>加载课程中...</Typography>
                                )}
                                {!isLoadingCourses && teacherCoursesForDropdown.length === 0 && (
                                    <Typography variant="caption" sx={{ pl: 2, pt: 0.5, color: 'text.secondary' }}>课程列表为空或您没有教授的课程。</Typography>
                                )}
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 12 }} sx={{ textAlign: 'right', mt: 2 }}> {/* 添加一些上边距 */}
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || isLoadingCourses} // 如果课程列表为空，应该允许提交吗？取决于业务逻辑。通常选择框没选项时提交按钮会禁用。
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        发布通知
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AssignmentForm;