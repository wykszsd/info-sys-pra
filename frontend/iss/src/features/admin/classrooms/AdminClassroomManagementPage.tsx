import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box, Button, Alert, Paper, Typography, Snackbar,
    TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, Grid as MuiGrid
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel, type GridRowId } from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import type { AppDispatch, RootState } from '../../../store'; // Adjust path
// Adjust path
import type { Classroom, ClassroomPayload } from '../../../types'; // Adjust path
// Adjust path
import {
    fetchAdminClassrooms, createAdminClassroom, updateAdminClassroom, deleteAdminClassroom,
    setAdminClassroomPage, setAdminClassroomPageSize
} from './store/adminClassroomSlice';
import ClassroomForm from './components/ClassroomForm';
import ConfirmDialog from '../../../components/common/ConfirmDialog'; // Adjust path

const AdminClassroomManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { classrooms, isLoading, error, totalCount, page, pageSize, filterBuilding, filterEquipment } =
        useSelector((state: RootState) => state.adminClassrooms);

    const [formOpen, setFormOpen] = useState(false);
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null);

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page, pageSize });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    // Local state for filter inputs before dispatching to Redux
    const [localFilterBuilding, setLocalFilterBuilding] = useState(filterBuilding || '');
    const [localFilterEquipment, setLocalFilterEquipment] = useState<Classroom['equipment'] | ''>(filterEquipment || '');

    const debouncedFetchClassrooms = useCallback(
        (paramsToDispatch: any) => {
            console.log("Debouncer called with equipment_eq:", paramsToDispatch.filter?.equipment_eq); // 调试点1
            const timer = setTimeout(() => {
                console.log("setTimeout executing for equipment_eq:", paramsToDispatch.filter?.equipment_eq); // 调试点2
                dispatch(fetchAdminClassrooms(paramsToDispatch));
            }, 500);
            const cleanup = () => {
                console.log("Clearing timer for equipment_eq:", paramsToDispatch.filter?.equipment_eq); // 调试点3
                clearTimeout(timer);
            };
            return cleanup;
        },
        [dispatch]
    );

    useEffect(() => {
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;

        const filterForApi: { building_like?: string; equipment_eq?: Classroom['equipment'] | '' } = {};

        if (localFilterBuilding && localFilterBuilding.trim() !== '') { // 确保非空字符串才作为过滤条件
            filterForApi.building_like = localFilterBuilding;
        }
        // localFilterEquipment 初始为 '', 或者具体的设备类型. '' 表示全部类型.
        // 我们总是想传递 equipment_eq，即使它是 ''，因为 API mock 端会处理它
        filterForApi.equipment_eq = localFilterEquipment;

        // 只有当 filterForApi 至少有一个定义的属性时才传递 filter 对象，
        // 或者如果 API 设计为总是期望 filter 对象（即使是空的或只有 equipment_eq: ''）
        // 根据你的 API Mock，它期望 filter 对象，即使只有 equipment_eq: ''

        debouncedFetchClassrooms({
            page: paginationModel.page,
            pageSize: paginationModel.pageSize,
            sort: sortParam,
            filter: filterForApi // 传递这个构建好的 filterForApi
        });
    }, [paginationModel.page, paginationModel.pageSize, sortModel, localFilterBuilding, localFilterEquipment, dispatch, debouncedFetchClassrooms]);


    const handleAddClick = () => { setEditingClassroom(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (classroom: Classroom) => { setEditingClassroom(classroom); setApiFormError(null); setFormOpen(true); };
    const handleDeleteClick = (id: GridRowId) => {
        const classroom = classrooms.find(c => c.classroomId === id);
        setDeletingId(id); setEditingClassroom(classroom || null); setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (deletingId !== null) {
            try {
                await dispatch(deleteAdminClassroom(deletingId as number)).unwrap();
                setSnackbar({ open: true, message: '教室删除成功', severity: 'success' });
            } catch (err: any) { setSnackbar({ open: true, message: `删除失败: ${err?.message || err || '未知错误'}`, severity: 'error' }); }
            finally { setConfirmOpen(false); setDeletingId(null); setEditingClassroom(null); }
        }
    };

    const handleFormClose = () => { setFormOpen(false); setEditingClassroom(null); setApiFormError(null); };
    const handleFormSubmit = async (data: ClassroomPayload) => {
        setApiFormError(null);
        try {
            if (editingClassroom) {
                await dispatch(updateAdminClassroom({ id: editingClassroom.classroomId, payload: data })).unwrap();
                setSnackbar({ open: true, message: '教室更新成功', severity: 'success' });
            } else {
                await dispatch(createAdminClassroom(data)).unwrap();
                setSnackbar({ open: true, message: '教室创建成功', severity: 'success' });
            }
            handleFormClose();
        } catch (err: any) {
            const errorMessage = err?.message || err || (editingClassroom ? '更新' : '创建') + '教室时发生未知错误';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage);
        }
    };

    const handlePaginationModelChange = (model: GridPaginationModel) => {
        setPaginationModel(model);
        dispatch(setAdminClassroomPage(model.page));
        dispatch(setAdminClassroomPageSize(model.pageSize));
    };
    const handleSortModelChange = (model: GridSortModel) => setSortModel(model);
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });



    const columns: GridColDef<Classroom>[] = [
        { field: 'classroomId', headerName: 'ID', width: 90 },
        { field: 'building', headerName: '教学楼', width: 200, flex: 1 },
        { field: 'roomNumber', headerName: '教室编号', width: 150 },
        { field: 'capacity', headerName: '容量', type: 'number', width: 100, align: 'center', headerAlign: 'center' },
        {
            field: 'equipment', headerName: '设备类型', width: 150,
            valueGetter: (value) => {
                switch (value) {
                    case 'basic': return '基础设备';
                    case 'multimedia': return '多媒体教室';
                    case 'lab': return '实验室';
                    default: return value;
                }
            }
        },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 150,
            getActions: ({ row }) => [
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                <Button size="small" startIcon={<DeleteIcon />} color="error" onClick={() => handleDeleteClick(row.classroomId)}>删除</Button>,
            ],
        },
    ];

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 32px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h1" gutterBottom>教室管理</Typography>
            {/* Filter Bar */}
            <MuiGrid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                <MuiGrid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth size="small" variant="outlined" placeholder="按教学楼搜索..."
                        value={localFilterBuilding}
                        onChange={(e) => setLocalFilterBuilding(e.target.value)}
                        InputProps={{ startAdornment: (<InputAdornment position="start"> <SearchIcon /> </InputAdornment>), }}
                    />
                </MuiGrid>
                <MuiGrid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>设备类型</InputLabel>
                        <Select
                            value={localFilterEquipment}
                            label="设备类型"
                            onChange={(e) => setLocalFilterEquipment(e.target.value as Classroom['equipment'] | '')}
                        >
                            <MenuItem value=""><em>全部类型</em></MenuItem>
                            <MenuItem value="basic">基础设备</MenuItem>
                            <MenuItem value="multimedia">多媒体</MenuItem>
                            <MenuItem value="lab">实验室</MenuItem>
                        </Select>
                    </FormControl>
                </MuiGrid>
                {/* <MuiGrid item size={{ xs: 12, sm: 'auto' }}>
                    <Button startIcon={<FilterListIcon />} onClick={handleFilterDispatch} variant="outlined">
                        应用筛选
                    </Button>
                </MuiGrid> */}
                <MuiGrid size={{ xs: 12, sm: 'auto' }} sx={{ ml: 'auto' }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>新增教室</Button>
                </MuiGrid>
            </MuiGrid>

            {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={classrooms} columns={columns} rowCount={totalCount}
                    loading={isLoading} pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={paginationModel} paginationMode="server" onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server" sortModel={sortModel} onSortModelChange={handleSortModelChange}
                    getRowId={(row) => row.classroomId}
                    localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
                    disableRowSelectionOnClick
                />
            </Box>

            <ClassroomForm open={formOpen} onClose={handleFormClose} onSubmit={handleFormSubmit} initialData={editingClassroom} isSubmitting={isLoading} apiError={apiFormError} />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setDeletingId(null); setEditingClassroom(null); }}
                onConfirm={handleConfirmDelete}
                title="确认删除教室"
                contentText={`您确定要删除教室 "${editingClassroom?.building} ${editingClassroom?.roomNumber}" 吗？如果该教室已被排课或考试占用，可能无法删除或会导致问题。`}
                isConfirming={isLoading}
            />
            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminClassroomManagementPage;