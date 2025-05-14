// src/features/admin/schedules/AdminScheduleManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Button, Alert, Paper, Typography, Snackbar, Grid, TextField, Autocomplete } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel, type GridRowId } from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { AppDispatch, RootState } from '../../../store';
import type { Schedule, SchedulePayload } from '../../../types';
import {
    fetchAdminSchedules, createAdminSchedule, updateAdminSchedule, deleteAdminSchedule,
    setAdminSchedulePage, setAdminSchedulePageSize, setAdminScheduleFilters
} from './store/adminScheduleSlice';
import ScheduleForm from './components/ScheduleForm';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const AdminScheduleManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        schedules,
        isLoading: isLoadingTable, // Renamed to avoid conflict and clarify it's for the main table
        isSubmitting,
        error,
        totalCount,
        page,
        pageSize,
        filterCourseId,
        filterTeacherId,
        filterClassroomId,
        filterSemesterId
    } = useSelector((state: RootState) => state.adminSchedules);

    // Data for dropdowns/filters from sharedData or other slices
    // Assuming state.sharedData.isLoading is an object like { courses: boolean, teachers: boolean, classrooms: boolean }
    const sharedData = useSelector((state: RootState) => state.sharedData);
    const allCoursesShort = sharedData.allCoursesShort;
    const allTeachers = sharedData.allTeachers;
    const allClassroomsShort = sharedData.allClassroomsShort;

    // Correctly extract boolean loading states if sharedData.isLoading is an object
    const isLoadingCourses = sharedData.isLoading?.courses ?? false;
    const isLoadingTeachers = sharedData.isLoading?.teachers ?? false;
    const isLoadingClassrooms = sharedData.isLoading?.classrooms ?? false;
    // If state.sharedData has flat loading states like isLoadingCourses, isLoadingTeachers, then use:
    // const isLoadingCourses = sharedData.isLoadingCourses; (and similar for others)

    const allSections = useSelector((state: RootState) => state.timetable.allSections);
    const isLoadingSections = useSelector((state: RootState) => state.timetable.isLoadingSections);
    const { semesters: allSemesters, isLoading: isLoadingSemesters } = useSelector((state: RootState) => state.adminSemesters);

    const [formOpen, setFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null);

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page, pageSize });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);

    const [localFilterCourseId, setLocalFilterCourseId] = useState<number | null>(filterCourseId || null);
    const [localFilterTeacherId, setLocalFilterTeacherId] = useState<string | null>(filterTeacherId || null);
    const [localFilterClassroomId, setLocalFilterClassroomId] = useState<number | null>(filterClassroomId || null);
    const [localFilterSemesterId, setLocalFilterSemesterId] = useState<number | null>(filterSemesterId || null);

    const loadSchedules = useCallback(() => {
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;
        dispatch(fetchAdminSchedules({
            page: paginationModel.page,
            pageSize: paginationModel.pageSize,
            sort: sortParam,
            filterCourseId: localFilterCourseId,
            filterTeacherId: localFilterTeacherId,
            filterClassroomId: localFilterClassroomId,
            filterSemesterId: localFilterSemesterId,
        }));
    }, [dispatch, paginationModel.page, paginationModel.pageSize, sortModel, localFilterCourseId, localFilterTeacherId, localFilterClassroomId, localFilterSemesterId]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const handleAddClick = () => { setEditingSchedule(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (schedule: Schedule) => { setEditingSchedule(schedule); setApiFormError(null); setFormOpen(true); };
    const handleDeleteClick = (id: GridRowId) => { setDeletingId(id); setConfirmOpen(true); };
    const handleConfirmDelete = async () => {
        if (deletingId !== null) {
            try { await dispatch(deleteAdminSchedule(deletingId as number)).unwrap(); setSnackbar({ open: true, message: '排课删除成功', severity: 'success' }); }
            catch (err: any) { setSnackbar({ open: true, message: `删除失败: ${err?.message || err || '未知错误'}`, severity: 'error' }); }
            finally { setConfirmOpen(false); setDeletingId(null); }
        }
    };
    const handleFormClose = () => { setFormOpen(false); setEditingSchedule(null); setApiFormError(null); };
    const handleFormSubmit = async (data: SchedulePayload) => {
        setApiFormError(null);
        try {
            if (editingSchedule) {
                await dispatch(updateAdminSchedule({ id: editingSchedule.scheduleId, payload: data })).unwrap();
                setSnackbar({ open: true, message: '排课更新成功', severity: 'success' });
            } else {
                await dispatch(createAdminSchedule(data)).unwrap();
                setSnackbar({ open: true, message: '排课创建成功', severity: 'success' });
            }
            handleFormClose();
        } catch (err: any) {
            const errorMessage = err?.message || err || '操作失败';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage);
        }
    };
    const handlePaginationModelChange = (model: GridPaginationModel) => {
        dispatch(setAdminSchedulePage(model.page));
        dispatch(setAdminSchedulePageSize(model.pageSize));
        setPaginationModel(model);
    };
    const handleSortModelChange = (model: GridSortModel) => setSortModel(model);
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const handleApplyFilters = () => {
        dispatch(setAdminScheduleFilters({
            filterCourseId: localFilterCourseId,
            filterTeacherId: localFilterTeacherId,
            filterClassroomId: localFilterClassroomId,
            filterSemesterId: localFilterSemesterId,
        }));
    };
    const handleClearFilters = () => {
        setLocalFilterCourseId(null);
        setLocalFilterTeacherId(null);
        setLocalFilterClassroomId(null);
        setLocalFilterSemesterId(null);
        dispatch(setAdminScheduleFilters({
            filterCourseId: null, filterTeacherId: null, filterClassroomId: null, filterSemesterId: null,
        }));
    };

    const columns: GridColDef<Schedule>[] = [
        { field: 'scheduleId', headerName: 'ID', width: 70 },
        { field: 'courseName', headerName: '课程', width: 200, valueGetter: (_value, row) => row.courseName || `(ID:${row.courseId})` },
        { field: 'teacherName', headerName: '教师', width: 120, valueGetter: (_value, row) => row.teacherName || `(ID:${row.teacherId})` },
        { field: 'classroomInfo', headerName: '教室', width: 150, valueGetter: (_value, row) => `${row.building || 'N/A'} ${row.roomNumber || 'N/A'}` },
        { field: 'timeInfo', headerName: '时间', width: 180, valueGetter: (_value, row) => `周${['一', '二', '三', '四', '五', '六', '日'][row.weekDay - 1]} 第${row.sectionId}节 (${row.startTime?.substring(0, 5)}-${row.endTime?.substring(0, 5)})` },
        { field: 'weeks', headerName: '周次', width: 180, flex: 1 },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 150,
            getActions: ({ row }) => [
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                <Button size="small" startIcon={<DeleteIcon />} color="error" onClick={() => handleDeleteClick(row.scheduleId)}>删除</Button>,
            ],
        },
    ];

    const areFiltersSet = localFilterCourseId || localFilterTeacherId || localFilterClassroomId || localFilterSemesterId;
    const isLoadingAnyDependency = isLoadingCourses || isLoadingTeachers || isLoadingClassrooms || isLoadingSections || isLoadingSemesters;

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 32px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">排课管理</Typography>
                {/* Now isLoadingCourses, isLoadingTeachers, etc. are booleans */}
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick} disabled={isLoadingCourses || isLoadingTeachers || isLoadingClassrooms || isLoadingSections}>
                    新增排课
                </Button>
            </Box>

            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>筛选排课</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allSemesters || []} getOptionLabel={(o) => `${o.semesterName} (${o.academicYear})`}
                            value={allSemesters?.find(s => s.semesterId === localFilterSemesterId) || null}
                            onChange={(_e, nv) => setLocalFilterSemesterId(nv?.semesterId || null)}
                            renderInput={(params) => <TextField {...params} label="学期" />}
                            disabled={isLoadingSemesters || isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allCoursesShort || []} getOptionLabel={(o) => `${o.courseCode} ${o.courseName}`}
                            value={allCoursesShort?.find(c => c.courseId === localFilterCourseId) || null}
                            onChange={(_e, nv) => setLocalFilterCourseId(nv?.courseId || null)}
                            renderInput={(params) => <TextField {...params} label="课程" />}
                            disabled={isLoadingCourses || isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allTeachers || []} getOptionLabel={(o) => `${o.name} (${o.teacherId})`}
                            value={allTeachers?.find(t => t.teacherId === localFilterTeacherId) || null}
                            onChange={(_e, nv) => setLocalFilterTeacherId(nv?.teacherId || null)}
                            renderInput={(params) => <TextField {...params} label="教师" />}
                            disabled={isLoadingTeachers || isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allClassroomsShort || []} getOptionLabel={(o) => `${o.building} ${o.roomNumber}`}
                            value={allClassroomsShort?.find(c => c.classroomId === localFilterClassroomId) || null}
                            onChange={(_e, nv) => setLocalFilterClassroomId(nv?.classroomId || null)}
                            renderInput={(params) => <TextField {...params} label="教室" />}
                            disabled={isLoadingClassrooms || isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="outlined" onClick={handleClearFilters} disabled={isLoadingTable || !areFiltersSet}>清空筛选</Button>
                        <Button variant="contained" startIcon={<FilterListIcon />} onClick={handleApplyFilters} disabled={isLoadingTable}>应用筛选</Button>
                    </Grid>
                </Grid>
            </Paper>

            {error && !isLoadingTable && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={schedules} columns={columns} rowCount={totalCount}
                    loading={isLoadingTable || isSubmitting} pageSizeOptions={[10, 25, 50]}
                    paginationModel={paginationModel} paginationMode="server" onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server" sortModel={sortModel} onSortModelChange={handleSortModelChange}
                    getRowId={(row) => row.scheduleId}
                    localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
                    disableRowSelectionOnClick
                />
            </Box>

            {formOpen && (
                <ScheduleForm
                    open={formOpen}
                    onClose={handleFormClose}
                    onSubmit={handleFormSubmit}
                    initialData={editingSchedule}
                    isSubmitting={isSubmitting}
                    apiFormError={apiFormError}
                    allCourses={allCoursesShort || []}
                    allTeachers={allTeachers || []}
                    allClassrooms={allClassroomsShort || []}
                    allSections={allSections || []}
                    isLoadingDependencies={isLoadingAnyDependency}
                />
            )}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="确认删除排课"
                contentText={`您确定要删除此条排课记录吗？`}
                isConfirming={isSubmitting}
            />
            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminScheduleManagementPage;