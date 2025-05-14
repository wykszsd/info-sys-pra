import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Button, Alert, Paper, Typography, Snackbar, Chip } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel, type GridRowId } from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined'; // Activate Icon
import type { AppDispatch, RootState } from '../../../store'; // Adjust path
// Adjust path
// Adjust path
import type { SemesterInfo, SemesterPayload } from '../../../types'; // Adjust path
// Adjust path
import {
    fetchAdminSemesters, createAdminSemester, updateAdminSemester, deleteAdminSemester, activateAdminSemester,
    setAdminSemesterPage, setAdminSemesterPageSize
} from './store/adminSemesterSlice';
import SemesterForm from './components/SemesterForm';
import ConfirmDialog from '../../../components/common/ConfirmDialog'; // Adjust path
import { formatDate } from '../../../utils/dateUtils'; // Adjust path

const AdminSemesterManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { semesters, isLoading, error, totalCount, page, pageSize, isActivating } = useSelector((state: RootState) => state.adminSemesters);

    const [formOpen, setFormOpen] = useState(false);
    const [editingSemester, setEditingSemester] = useState<SemesterInfo | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null);
    const [activatingId, setActivatingId] = useState<GridRowId | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null);

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page, pageSize });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);

    const loadSemesters = useCallback(() => {
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;
        dispatch(fetchAdminSemesters({ page: paginationModel.page, pageSize: paginationModel.pageSize, sort: sortParam }));
    }, [dispatch, paginationModel.page, paginationModel.pageSize, sortModel]);

    useEffect(() => { loadSemesters(); }, [loadSemesters]);

    const handleAddClick = () => { setEditingSemester(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (semester: SemesterInfo) => { setEditingSemester(semester); setApiFormError(null); setFormOpen(true); };
    const handleDeleteClick = (id: GridRowId) => {
        const semester = semesters.find(s => s.semesterId === id);
        setDeletingId(id); setEditingSemester(semester || null); setConfirmOpen(true);
    };
    const handleActivateClick = (id: GridRowId) => {
        const semester = semesters.find(s => s.semesterId === id);
        setActivatingId(id); setEditingSemester(semester || null);
        // Open a specific confirm dialog for activation
        setConfirmOpen(true); // Reuse confirmOpen but with different message/action
    };


    const handleConfirmAction = async () => {
        if (deletingId !== null) { // Deletion
            try {
                await dispatch(deleteAdminSemester(deletingId as number)).unwrap();
                setSnackbar({ open: true, message: '学期删除成功', severity: 'success' });
            } catch (err: any) { setSnackbar({ open: true, message: `删除失败: ${err?.message || err || '未知错误'}`, severity: 'error' }); }
            finally { setDeletingId(null); }
        } else if (activatingId !== null) { // Activation
            try {
                await dispatch(activateAdminSemester(activatingId as number)).unwrap();
                setSnackbar({ open: true, message: '当前学期设置成功', severity: 'success' });
            } catch (err: any) { setSnackbar({ open: true, message: `设置失败: ${err?.message || err || '未知错误'}`, severity: 'error' }); }
            finally { setActivatingId(null); }
        }
        setConfirmOpen(false);
        setEditingSemester(null);
    };


    const handleFormClose = () => { setFormOpen(false); setEditingSemester(null); setApiFormError(null); };
    const handleFormSubmit = async (data: SemesterPayload) => {
        setApiFormError(null);
        try {
            if (editingSemester) {
                await dispatch(updateAdminSemester({ id: editingSemester.semesterId, payload: data })).unwrap();
                setSnackbar({ open: true, message: '学期更新成功', severity: 'success' });
            } else {
                await dispatch(createAdminSemester(data)).unwrap();
                setSnackbar({ open: true, message: '学期创建成功', severity: 'success' });
            }
            handleFormClose();
        } catch (err: any) {
            const errorMessage = err?.message || err || '操作失败';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage);
        }
    };

    const handlePaginationModelChange = (model: GridPaginationModel) => {
        setPaginationModel(model);
        dispatch(setAdminSemesterPage(model.page));
        dispatch(setAdminSemesterPageSize(model.pageSize));
    };
    const handleSortModelChange = (model: GridSortModel) => setSortModel(model);
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const columns: GridColDef<SemesterInfo>[] = [
        { field: 'semesterName', headerName: '学期名称', width: 250, flex: 1 },
        { field: 'academicYear', headerName: '学年', width: 120 },
        { field: 'termType', headerName: '类型', width: 100, valueGetter: (value) => value === 'spring' ? '春季' : '秋季' },
        { field: 'startDate', headerName: '开始日期', width: 130, valueGetter: (value) => formatDate(value as string, 'yyyy-MM-dd') },
        { field: 'endDate', headerName: '结束日期', width: 130, valueGetter: (value) => formatDate(value as string, 'yyyy-MM-dd') },
        {
            field: 'isCurrent', headerName: '当前学期', width: 120, align: 'center', headerAlign: 'center',
            renderCell: (params) => params.value ? <Chip icon={<CheckCircleOutlineIcon />} label="是" color="success" size="small" /> : <Chip icon={<HighlightOffIcon />} label="否" size="small" />
        },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 220,
            getActions: ({ row }) => [
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                ...(row.isCurrent ? [] : [ // Only show activate if not current
                    <Button size="small" startIcon={<PlayCircleFilledWhiteOutlinedIcon />} color="primary" onClick={() => handleActivateClick(row.semesterId)} disabled={isActivating}>设为当前</Button>
                ]),
                <Button size="small" startIcon={<DeleteIcon />} color="error" onClick={() => handleDeleteClick(row.semesterId)} disabled={row.isCurrent}>删除</Button>, // Cannot delete current semester
            ],
        },
    ];

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 32px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">学期管理</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>新增学期</Button>
            </Box>
            {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={semesters} columns={columns} rowCount={totalCount}
                    loading={isLoading || isActivating} pageSizeOptions={[5, 10, 20]}
                    paginationModel={paginationModel} paginationMode="server" onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server" sortModel={sortModel} onSortModelChange={handleSortModelChange}
                    getRowId={(row) => row.semesterId}
                    localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
                    disableRowSelectionOnClick
                />
            </Box>
            <SemesterForm open={formOpen} onClose={handleFormClose} onSubmit={handleFormSubmit} initialData={editingSemester} isSubmitting={isLoading} apiError={apiFormError} />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setDeletingId(null); setActivatingId(null); setEditingSemester(null); }}
                onConfirm={handleConfirmAction}
                title={deletingId ? "确认删除学期" : (activatingId ? "确认激活学期" : "确认操作")}
                contentText={
                    deletingId ? `您确定要删除学期 "${editingSemester?.semesterName || ''}" 吗？` :
                        (activatingId ? `您确定要将 "${editingSemester?.semesterName || ''}" 设为当前学期吗？所有其他学期将变为非当前。` : "请确认此操作。")
                }
                isConfirming={isLoading || isActivating}
            />
            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminSemesterManagementPage;