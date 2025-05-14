import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box, Button, Alert, Paper, Typography, Snackbar, Tabs, Tab,
    TextField, InputAdornment, Chip, Grid
} from '@mui/material';
import {
    DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel, type GridRowId,
    GridToolbarContainer, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport
} from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales'; // MUI DataGrid Chinese locale
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
// import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Optional: For Reset Password
// import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Optional: For Reset Password
import type { AppDispatch, RootState } from '../../../store'; // Adjust path
// Adjust path
import type { UserDetail, UserPayload, UserRole } from '../../../types'; // Adjust path
// Adjust path
import {
    fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
    setAdminUserPage, setAdminUserPageSize, setAdminUserRoleFilter, setAdminUserUsernameFilter
} from './store/adminUserSlice'; // Adjust path
import UserForm from './components/UserForm'; // Adjust path
import ConfirmDialog from '../../../components/common/ConfirmDialog'; // Adjust path

// Custom Toolbar for DataGrid (optional, for more control over buttons)
function CustomUserToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport csvOptions={{ fileName: '用户列表', utf8WithBom: true }} />
        </GridToolbarContainer>
    );
}


const AdminUserManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        users, isLoading, isSubmitting, error, totalCount,
        page, pageSize, filterRole, filterUsername: reduxFilterUsername
    } = useSelector((state: RootState) => state.adminUsers);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null);

    // DataGrid pagination and sort state
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page, pageSize });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    // Local state for username filter input for debouncing
    const [localUsernameSearchTerm, setLocalUsernameSearchTerm] = useState(reduxFilterUsername || '');

    // Debounced username filter update to Redux store
    useEffect(() => {
        const handler = setTimeout(() => {
            if (localUsernameSearchTerm !== reduxFilterUsername) { // Only dispatch if changed
                dispatch(setAdminUserUsernameFilter(localUsernameSearchTerm));
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [localUsernameSearchTerm, reduxFilterUsername, dispatch]);


    // Fetch users when pagination, sort, or filters (from Redux) change


    const debouncedFetchUsers = useCallback(
        (params: any) => {
            const timer = setTimeout(() => {
                dispatch(fetchAdminUsers(params));
            }, 500);
            return () => clearTimeout(timer);
        },
        [dispatch]
    );

    useEffect(() => {
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;
        debouncedFetchUsers({
            page: paginationModel.page,
            pageSize: paginationModel.pageSize,
            sort: sortParam,
            filterRole: filterRole,
            filterUsername: localUsernameSearchTerm || undefined,
        });
    }, [paginationModel.page, paginationModel.pageSize, sortModel, filterRole, localUsernameSearchTerm, dispatch, debouncedFetchUsers]);


    const handleAddClick = () => { setEditingUser(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (userToEdit: UserDetail) => { setEditingUser(userToEdit); setApiFormError(null); setFormOpen(true); }; // Ensure correct type
    const handleDeleteClick = (id: GridRowId) => {
        const userToDelete = users.find(u => u.userId === id);
        setDeletingId(id);
        setEditingUser(userToDelete || null);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (deletingId !== null) {
            try { await dispatch(deleteAdminUser(deletingId as number)).unwrap(); setSnackbar({ open: true, message: '用户删除成功！', severity: 'success' }); }
            catch (err: any) { setSnackbar({ open: true, message: `删除失败: ${err?.message || err || '未知错误'}`, severity: 'error' }); }
            finally { setConfirmOpen(false); setDeletingId(null); setEditingUser(null); }
        }
    };
    const handleFormClose = () => { setFormOpen(false); setEditingUser(null); setApiFormError(null); };
    const handleFormSubmit = async (data: UserPayload) => {
        setApiFormError(null);
        try {
            if (editingUser) { await dispatch(updateAdminUser({ id: editingUser.userId, payload: data })).unwrap(); setSnackbar({ open: true, message: '用户更新成功！', severity: 'success' }); }
            else { await dispatch(createAdminUser(data)).unwrap(); setSnackbar({ open: true, message: '用户创建成功！', severity: 'success' }); }
            handleFormClose();
        } catch (err: any) {
            const errorMessage = err?.message || err || (editingUser ? '更新' : '创建') + '用户时发生未知错误';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage);
        }
    };
    const handlePaginationModelChange = (model: GridPaginationModel) => {
        dispatch(setAdminUserPage(model.page));
        dispatch(setAdminUserPageSize(model.pageSize));
        setPaginationModel(model);
    };
    const handleSortModelChange = (model: GridSortModel) => setSortModel(model);
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const handleRoleFilterChange = (_event: React.SyntheticEvent, newValue: UserRole | 'all') => {
        dispatch(setAdminUserRoleFilter(newValue));
    };
    const handleUsernameSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalUsernameSearchTerm(event.target.value);
    };


    // DataGrid Columns for Users
    const columns: GridColDef<UserDetail>[] = [
        { field: 'userId', headerName: 'ID', width: 70 },
        { field: 'username', headerName: '用户名 (学号/工号)', width: 180, flex: 0.5 },
        {
            field: 'role', headerName: '角色', width: 100,
            renderCell: ({ value }) => {
                let chipColor: "primary" | "secondary" | "default" | "error" | "info" | "success" | "warning" = "default";
                let roleLabel = value as string;
                if (value === 'admin') { chipColor = 'secondary'; roleLabel = '管理员'; }
                else if (value === 'teacher') { chipColor = 'primary'; roleLabel = '教师'; }
                else if (value === 'student') { roleLabel = '学生'; }
                return <Chip label={roleLabel} size="small" color={chipColor} variant="outlined" />;
            }
        },
        { field: 'email', headerName: '邮箱', width: 220, flex: 0.7 },
        { field: 'phone', headerName: '手机号', width: 130 },
        {
            field: 'details', headerName: '角色详情', width: 280, sortable: false, flex: 1,
            valueGetter: (_value, row) => { // Corrected valueGetter signature
                if (row.role === 'student') return `班级: ${row.class_name || '-'}, 入学年份: ${row.enrollment_year || '-'}`;
                if (row.role === 'teacher') return `院系: ${row.department || '-'}, 职称: ${row.title || '-'}`;
                return '无特定详情';
            }
        },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 160,
            getActions: ({ row }) => [ // 'row' is of type UserDetail
                <Button key={`edit-${row.userId}`} size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                <Button
                    key={`delete-${row.userId}`}
                    size="small"
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={() => handleDeleteClick(row.userId)}
                    // <<< 修复：使用 currentUser >>>
                    disabled={row.username === 'admin' || (currentUser?.userId === row.userId)}
                >
                    删除
                </Button>,
            ],
        },
    ];

    const memoizedColumns = useMemo(() => columns, [currentUser]); // Add currentUser as dependency

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 16px - 16px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header: Title, Search, Role Tabs, Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5" component="h1">用户管理</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
                    新增用户
                </Button>
            </Box>

            {/* Filters */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}> {/* MUI v6 Grid */}
                        <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            placeholder="搜索用户名/学号/工号..."
                            value={localUsernameSearchTerm}
                            onChange={handleUsernameSearchInputChange}
                            InputProps={{
                                startAdornment: (<InputAdornment position="start"> <SearchIcon /> </InputAdornment>),
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}> {/* MUI v6 Grid */}
                        <Tabs value={filterRole} onChange={handleRoleFilterChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                            <Tab label="全部角色" value="all" />
                            <Tab label="学生" value="student" />
                            <Tab label="教师" value="teacher" />
                            <Tab label="管理员" value="admin" />
                        </Tabs>
                    </Grid>
                </Grid>
            </Paper>

            {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* DataGrid */}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={memoizedColumns} // Use memoized columns
                    rowCount={totalCount}
                    loading={isLoading || isSubmitting}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={paginationModel}
                    paginationMode="server"
                    onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server"
                    sortModel={sortModel}
                    onSortModelChange={handleSortModelChange}
                    getRowId={(row: UserDetail) => row.userId} // Ensure row type is UserDetail
                    localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
                    disableRowSelectionOnClick
                    slots={{ toolbar: CustomUserToolbar }}
                />
            </Box>

            {/* Dialogs and Snackbar */}
            {formOpen && ( // Conditionally render form to help with reset
                <UserForm
                    open={formOpen}
                    onClose={handleFormClose}
                    onSubmit={handleFormSubmit}
                    initialData={editingUser}
                    isSubmitting={isSubmitting} // Pass the correct submitting flag
                    apiError={apiFormError}
                />
            )}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setDeletingId(null); setEditingUser(null); }}
                onConfirm={handleConfirmDelete}
                title="确认删除用户"
                contentText={`您确定要删除用户 "${editingUser?.username || ''}" 吗？此操作通常无法撤销。`}
                isConfirming={isSubmitting} // Use isSubmitting for loading state of confirm button
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

export default AdminUserManagementPage;