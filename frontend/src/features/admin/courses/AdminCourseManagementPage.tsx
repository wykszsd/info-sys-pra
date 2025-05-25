import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// 移除了 CircularProgress
import { Box, Button, Alert, Paper, Typography, Snackbar, TextField, InputAdornment } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel, type GridRowId } from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import type { AppDispatch, RootState } from '../../../store'; // Adjust path
// Adjust path
// Adjust path
import type { Course, CoursePayload } from '../../../types'; // Adjust path
// Adjust path
import {
    fetchAdminCourses, createAdminCourse, updateAdminCourse, deleteAdminCourse,
    setAdminCoursePage, setAdminCoursePageSize
    // 移除了 setAdminCourseFilterName
} from './store/adminCourseSlice';
import CourseForm from './components/CourseForm';
import ConfirmDialog from '../../../components/common/ConfirmDialog'; // Adjust path

const AdminCourseManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    // filterName 仍然从 state 中读取，但不再有 setAdminCourseFilterName action 被导入
    const { courses, isLoading, error, totalCount, page, pageSize, filterName } = useSelector((state: RootState) => state.adminCourses);

    const [formOpen, setFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null); // GridRowId can be number or string
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null); // For form-specific API errors

    // DataGrid state
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page, pageSize });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    const [localFilterName, setLocalFilterName] = useState(filterName || ''); // Local search term

    const debouncedFetch = useCallback(
        // Basic debounce, consider using lodash.debounce for more robust solution
        (params: any) => {
            const timer = setTimeout(() => {
                dispatch(fetchAdminCourses(params));
            }, 500);
            return () => clearTimeout(timer);
        },
        [dispatch]
    );


    useEffect(() => {
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;
        // 注意：这里的 filterParam 仍然是基于 localFilterName 构建的，与 Redux filterName 解耦
        const filterParam = localFilterName ? { courseName_like: localFilterName } : undefined;
        // Dispatch immediately or use debouncedFetch for filters
        debouncedFetch({
            page: paginationModel.page,
            pageSize: paginationModel.pageSize,
            sort: sortParam,
            filter: filterParam // 使用本地 filterParam
        });
        // 依赖项中移除了 filterName (Redux state)，因为现在由 localFilterName 驱动
    }, [paginationModel.page, paginationModel.pageSize, sortModel, localFilterName, dispatch, debouncedFetch]);

    const handleAddClick = () => { setEditingCourse(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (course: Course) => { setEditingCourse(course); setApiFormError(null); setFormOpen(true); };
    const handleDeleteClick = (id: GridRowId) => {
        const course = courses.find(c => c.courseId === id);
        setDeletingId(id);
        setEditingCourse(course || null); // For display in confirm dialog
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (deletingId !== null) {
            try {
                await dispatch(deleteAdminCourse(deletingId as number)).unwrap(); // Cast as number
                setSnackbar({ open: true, message: '课程删除成功', severity: 'success' });
            } catch (err: any) {
                setSnackbar({ open: true, message: `删除失败: ${err?.message || err || '未知错误'}`, severity: 'error' });
            } finally {
                setConfirmOpen(false);
                setDeletingId(null);
            }
        }
    };

    const handleFormClose = () => { setFormOpen(false); setEditingCourse(null); setApiFormError(null); };
    const handleFormSubmit = async (data: CoursePayload) => {
        setApiFormError(null); // Clear previous API error
        try {
            if (editingCourse) {
                await dispatch(updateAdminCourse({ id: editingCourse.courseId, payload: data })).unwrap();
                setSnackbar({ open: true, message: '课程更新成功', severity: 'success' });
            } else {
                await dispatch(createAdminCourse(data)).unwrap();
                setSnackbar({ open: true, message: '课程创建成功', severity: 'success' });
            }
            handleFormClose();
        } catch (err: any) {
            const errorMessage = err?.message || err || (editingCourse ? '更新' : '创建') + '课程时发生未知错误';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage); // Pass error to form
        }
    };

    const handlePaginationModelChange = (model: GridPaginationModel) => {
        setPaginationModel(model); // Local state update triggers useEffect
        dispatch(setAdminCoursePage(model.page));
        dispatch(setAdminCoursePageSize(model.pageSize));
    };
    const handleSortModelChange = (model: GridSortModel) => setSortModel(model);
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
    const handleFilterNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFilterName(event.target.value); // Update local state, useEffect will fetch
        // dispatch(setAdminCourseFilterName(event.target.value)); // 这行保持注释或删除，因为 action 已不再导入
    };


    const columns: GridColDef<Course>[] = [
        { field: 'courseId', headerName: 'ID', width: 90 },
        { field: 'courseCode', headerName: '课程代码', width: 130 },
        { field: 'courseName', headerName: '课程名称', width: 250, flex: 1 },
        { field: 'credit', headerName: '学分', type: 'number', width: 90, align: 'center', headerAlign: 'center' },
        { field: 'semester', headerName: '默认学期', width: 100, valueGetter: (value) => value === 'spring' ? '春季' : '秋季' },
        { field: 'year', headerName: '默认年份', type: 'number', width: 100 },
        { field: 'maxCapacity', headerName: '容量', type: 'number', width: 90, align: 'center', headerAlign: 'center' },
        {
            field: 'prerequisites', headerName: '先修课程', width: 200,
            valueGetter: (value) => {
                try {
                    // 确保 value 存在且是字符串
                    const prereqs = JSON.parse((value as string) || '[]');
                    return Array.isArray(prereqs) ? prereqs.join(', ') : '';
                } catch { return ''; }
            }
        },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 150,
            getActions: ({ row }) => [
                <Button key={`edit-${row.courseId}`} size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                <Button key={`delete-${row.courseId}`} size="small" startIcon={<DeleteIcon />} color="error" onClick={() => handleDeleteClick(row.courseId)}>删除</Button>,
            ],
        },
    ];

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 32px)', display: 'flex', flexDirection: 'column' }}> {/* Adjust height as needed */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5" component="h1">课程管理</Typography>
                <TextField
                    size="small" variant="outlined" placeholder="按名称或代码搜索..."
                    value={localFilterName} onChange={handleFilterNameChange}
                    InputProps={{ startAdornment: (<InputAdornment position="start"> <SearchIcon /> </InputAdornment>), }}
                    sx={{ width: { xs: '100%', sm: 300 } }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>新增课程</Button>
            </Box>

            {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={courses}
                    columns={columns}
                    rowCount={totalCount}
                    loading={isLoading} // DataGrid 会处理加载指示器
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={paginationModel}
                    paginationMode="server"
                    onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server"
                    sortModel={sortModel}
                    onSortModelChange={handleSortModelChange}
                    getRowId={(row) => row.courseId}
                    localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
                    disableRowSelectionOnClick
                // autoHeight // Use if you don't want fixed height
                />
            </Box>

            <CourseForm
                open={formOpen}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
                initialData={editingCourse}
                isSubmitting={isLoading} // Could use a more specific isSubmitting flag from slice
                apiError={apiFormError}
            />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="确认删除课程"
                contentText={`您确定要删除课程 "${editingCourse?.courseName || ''}" (代码: ${editingCourse?.courseCode}) 吗？此操作无法撤销，并可能影响已有的排课信息。`}
                isConfirming={isLoading} // Disable confirm button while deleting
            />
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminCourseManagementPage;