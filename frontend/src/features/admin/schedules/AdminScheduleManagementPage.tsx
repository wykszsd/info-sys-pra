// src/features/admin/schedules/AdminScheduleManagementPage.tsx
import React, { useState, useEffect, useMemo } from 'react'; // 确保导入 useMemo
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
import { fetchAllCoursesShortList, fetchAllTeachersList, fetchAllClassroomsShortList } from '../../../store/sharedDataSlice';
import { fetchAllTimetableSections } from '../../timetable/store/timetableSlice';
import { fetchAdminSemesters } from '../semesters/store/adminSemesterSlice';

const AdminScheduleManagementPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        schedules,
        isLoading: isLoadingTable,
        isSubmitting,
        error,
        totalCount,
        page: reduxPage,
        pageSize: reduxPageSize,
        filterCourseId: reduxFilterCourseId,
        filterTeacherId: reduxFilterTeacherId,
        filterClassroomId: reduxFilterClassroomId,
        filterSemesterId: reduxFilterSemesterId
    } = useSelector((state: RootState) => state.adminSchedules);

    const sharedData = useSelector((state: RootState) => state.sharedData);
    const allCoursesShort = sharedData.allCoursesShort;
    const allTeachers = sharedData.allTeachers;
    const allClassroomsShort = sharedData.allClassroomsShort;
    const isLoadingCourses = sharedData.isLoading?.courses ?? false;
    const isLoadingTeachers = sharedData.isLoading?.teachers ?? false;
    const isLoadingClassrooms = sharedData.isLoading?.classrooms ?? false;

    const allSections = useSelector((state: RootState) => state.timetable.allSections);
    const isLoadingSections = useSelector((state: RootState) => state.timetable.isLoadingSections);
    const { semesters: allSemestersForFilter, isLoading: isLoadingSemestersForFilter } = useSelector((state: RootState) => state.adminSemesters);

    const [formOpen, setFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<GridRowId | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
    const [apiFormError, setApiFormError] = useState<string | null>(null);

    const [sortModel, setSortModel] = useState<GridSortModel>([]);

    const [localFilterCourseId, setLocalFilterCourseId] = useState<number | null>(reduxFilterCourseId || null);
    const [localFilterTeacherId, setLocalFilterTeacherId] = useState<string | null>(reduxFilterTeacherId || null);
    const [localFilterClassroomId, setLocalFilterClassroomId] = useState<number | null>(reduxFilterClassroomId || null);
    const [localFilterSemesterId, setLocalFilterSemesterId] = useState<number | null>(reduxFilterSemesterId || null);

    // 获取下拉列表数据的 Effect
    useEffect(() => {
        console.log('[Effect] Dropdown data fetch triggered. Current loading states:', { isLoadingCourses, isLoadingTeachers, isLoadingClassrooms, isLoadingSections, isLoadingSemestersForFilter });
        if (allCoursesShort.length === 0 && !isLoadingCourses) dispatch(fetchAllCoursesShortList());
        if (allTeachers.length === 0 && !isLoadingTeachers) dispatch(fetchAllTeachersList());
        if (allClassroomsShort.length === 0 && !isLoadingClassrooms) dispatch(fetchAllClassroomsShortList());
        if (allSections.length === 0 && !isLoadingSections) dispatch(fetchAllTimetableSections());
        if ((!allSemestersForFilter || allSemestersForFilter.length === 0) && !isLoadingSemestersForFilter) {
            dispatch(fetchAdminSemesters({ page: 0, pageSize: 200 }));
        }
    }, [
        dispatch,
        allCoursesShort.length, // 使用长度作为依赖，比直接用数组引用更稳定
        allTeachers.length,
        allClassroomsShort.length,
        allSections.length,
        allSemestersForFilter?.length, // 安全访问 length
        isLoadingCourses,
        isLoadingTeachers,
        isLoadingClassrooms,
        isLoadingSections,
        isLoadingSemestersForFilter
    ]);

    // 将 sortModel 转换为稳定的字符串形式，用于 useEffect 依赖
    const sortModelString = useMemo(() => JSON.stringify(sortModel), [sortModel]);

    // 获取排课列表数据的 Effect
    useEffect(() => {
        console.log(`[Effect] Fetching admin schedules. Page: ${reduxPage}, PageSize: ${reduxPageSize}, Sort: ${sortModelString}, Filters:`, { reduxFilterCourseId, reduxFilterTeacherId, reduxFilterClassroomId, reduxFilterSemesterId });
        const sortParam = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : undefined;
        dispatch(fetchAdminSchedules({
            page: reduxPage,
            pageSize: reduxPageSize,
            sort: sortParam,
            filterCourseId: reduxFilterCourseId,
            filterTeacherId: reduxFilterTeacherId,
            filterClassroomId: reduxFilterClassroomId,
            filterSemesterId: reduxFilterSemesterId,
        }));
    }, [
        dispatch,
        reduxPage,
        reduxPageSize,
        sortModelString, // 使用 memoized 的字符串
        reduxFilterCourseId,
        reduxFilterTeacherId,
        reduxFilterClassroomId,
        reduxFilterSemesterId
    ]);

    // 同步 Redux 筛选条件到本地筛选输入框状态的 Effect
    useEffect(() => {
        // console.log('[Effect] Syncing Redux filters to local state.');
        setLocalFilterCourseId(reduxFilterCourseId || null);
        setLocalFilterTeacherId(reduxFilterTeacherId || null);
        setLocalFilterClassroomId(reduxFilterClassroomId || null);
        setLocalFilterSemesterId(reduxFilterSemesterId || null);
    }, [reduxFilterCourseId, reduxFilterTeacherId, reduxFilterClassroomId, reduxFilterSemesterId]);

    const handlePaginationModelChange = (model: GridPaginationModel) => {
        console.log('[Event] handlePaginationModelChange triggered. New model:', model, 'Current Redux: page=', reduxPage, 'pageSize=', reduxPageSize);
        let changed = false;
        if (model.page !== reduxPage) {
            console.log('  Page changed. Dispatching setAdminSchedulePage:', model.page);
            dispatch(setAdminSchedulePage(model.page));
            changed = true;
        }
        if (model.pageSize !== reduxPageSize) {
            console.log('  PageSize changed. Dispatching setAdminSchedulePageSize:', model.pageSize);
            dispatch(setAdminSchedulePageSize(model.pageSize));
            changed = true;
        }
        if (!changed) {
            console.log('  Pagination model did not change relevant values.');
        }
    };

    const handleSortModelChange = (newModel: GridSortModel) => {
        console.log('[Event] handleSortModelChange triggered. New model:', newModel, 'Current sortModel:', sortModel);
        // 只有当排序模型实际内容改变时才更新状态，以避免不必要的重渲染
        if (JSON.stringify(newModel) !== JSON.stringify(sortModel)) {
            console.log('  Sort model content changed. Setting new sortModel.');
            setSortModel(newModel);
        } else {
            console.log('  Sort model content is the same. Not updating state.');
        }
    };

    const handleApplyFilters = () => {
        console.log('[Event] handleApplyFilters. Resetting page to 0 if not already. Current reduxPage:', reduxPage);
        if (reduxPage !== 0) {
            dispatch(setAdminSchedulePage(0));
        }
        dispatch(setAdminScheduleFilters({
            filterCourseId: localFilterCourseId,
            filterTeacherId: localFilterTeacherId,
            filterClassroomId: localFilterClassroomId,
            filterSemesterId: localFilterSemesterId,
        }));
    };

    const handleClearFilters = () => {
        console.log('[Event] handleClearFilters. Resetting page to 0 if not already. Current reduxPage:', reduxPage);
        setLocalFilterCourseId(null);
        setLocalFilterTeacherId(null);
        setLocalFilterClassroomId(null);
        setLocalFilterSemesterId(null);
        if (reduxPage !== 0) {
            dispatch(setAdminSchedulePage(0));
        }
        dispatch(setAdminScheduleFilters({
            filterCourseId: null, filterTeacherId: null, filterClassroomId: null, filterSemesterId: null,
        }));
    };

    const handleAddClick = () => { setEditingSchedule(null); setApiFormError(null); setFormOpen(true); };
    const handleEditClick = (schedule: Schedule) => { setEditingSchedule(schedule); setApiFormError(null); setFormOpen(true); };
    const handleDeleteClick = (id: GridRowId) => {
        const schedule = schedules.find(s => s.scheduleId === id);
        setEditingSchedule(schedule || null);
        setDeletingId(id);
        setConfirmOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (deletingId !== null) {
            try { await dispatch(deleteAdminSchedule(deletingId as number)).unwrap(); setSnackbar({ open: true, message: '排课删除成功', severity: 'success' }); }
            catch (err: any) { setSnackbar({ open: true, message: `删除失败: ${err?.message || String(err) || '未知错误'}`, severity: 'error' }); }
            finally { setConfirmOpen(false); setDeletingId(null); setEditingSchedule(null); }
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
            const errorMessage = err?.message || String(err) || '操作失败';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            setApiFormError(errorMessage);
        }
    };
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const columns: GridColDef<Schedule>[] = [
        { field: 'scheduleId', headerName: 'ID', width: 70 },
        { field: 'courseName', headerName: '课程', width: 200, valueGetter: (_value, row) => `${row.courseCode || ''} ${row.courseName || `(ID:${row.courseId})`}` },
        { field: 'teacherName', headerName: '教师', width: 120, valueGetter: (_value, row) => row.teacherName || `(ID:${row.teacherId})` },
        { field: 'classroomInfo', headerName: '教室', width: 150, valueGetter: (_value, row) => `${row.classroomBuilding} ${row.classroomRoomNumber}` },
        { field: 'timeInfo', headerName: '时间', width: 180, valueGetter: (_value, row) => `周${['一', '二', '三', '四', '五', '六', '日'][row.weekDay - 1]} 第${row.sectionId}节 (${row.startTime?.substring(0, 5)}-${row.endTime?.substring(0, 5)})` },
        { field: 'weeks', headerName: '周次', width: 180, flex: 1 },
        {
            field: 'actions', headerName: '操作', type: 'actions', width: 150,
            getActions: ({ row }) => [
                <Button key={`edit-${row.scheduleId}`} size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>编辑</Button>,
                <Button key={`delete-${row.scheduleId}`} size="small" startIcon={<DeleteIcon />} color="error" onClick={() => handleDeleteClick(row.scheduleId)}>删除</Button>,
            ],
        },
    ];

    const areFiltersSet = localFilterCourseId || localFilterTeacherId || localFilterClassroomId || localFilterSemesterId;
    const isLoadingAnyDependency = isLoadingCourses || isLoadingTeachers || isLoadingClassrooms || isLoadingSections || isLoadingSemestersForFilter;

    return (
        <Paper sx={{ p: 2, height: 'calc(100vh - 64px - 48px - 32px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">排课管理</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick} disabled={isLoadingAnyDependency}>
                    新增排课
                </Button>
            </Box>

            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>筛选排课</Typography>
                <Grid container spacing={2} alignItems="center">
                    {/* Grid size prop 保持用户原有写法 */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allSemestersForFilter || []} getOptionLabel={(o) => `${o.semesterName} (${o.academicYear})`}
                            value={allSemestersForFilter?.find(s => s.semesterId === localFilterSemesterId) || null}
                            onChange={(_e, nv) => setLocalFilterSemesterId(nv?.semesterId || null)}
                            renderInput={(params) => <TextField {...params} label="学期 (筛选条件)" />}
                            loading={isLoadingSemestersForFilter}
                            disabled={isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allCoursesShort || []} getOptionLabel={(o) => `${o.courseCode} ${o.courseName}`}
                            value={allCoursesShort?.find(c => c.courseId === localFilterCourseId) || null}
                            onChange={(_e, nv) => setLocalFilterCourseId(nv?.courseId || null)}
                            renderInput={(params) => <TextField {...params} label="课程" />}
                            loading={isLoadingCourses}
                            disabled={isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allTeachers || []} getOptionLabel={(o) => `${o.name} (${o.teacherId})`}
                            value={allTeachers?.find(t => t.teacherId === localFilterTeacherId) || null}
                            onChange={(_e, nv) => setLocalFilterTeacherId(nv?.teacherId || null)}
                            renderInput={(params) => <TextField {...params} label="教师" />}
                            loading={isLoadingTeachers}
                            disabled={isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Autocomplete fullWidth size="small"
                            options={allClassroomsShort || []} getOptionLabel={(o) => `${o.building} ${o.roomNumber}`}
                            value={allClassroomsShort?.find(c => c.classroomId === localFilterClassroomId) || null}
                            onChange={(_e, nv) => setLocalFilterClassroomId(nv?.classroomId || null)}
                            renderInput={(params) => <TextField {...params} label="教室" />}
                            loading={isLoadingClassrooms}
                            disabled={isLoadingTable}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Button variant="outlined" onClick={handleClearFilters} disabled={isLoadingTable || !areFiltersSet}>清空筛选</Button>
                        <Button variant="contained" startIcon={<FilterListIcon />} onClick={handleApplyFilters} disabled={isLoadingTable || !localFilterSemesterId /* 学期是必选筛选条件 */}>应用筛选</Button>
                    </Grid>
                </Grid>
            </Paper>

            {error && !isLoadingTable && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                    rows={schedules} columns={columns} rowCount={totalCount}
                    loading={isLoadingTable || isSubmitting} pageSizeOptions={[10, 25, 50]}
                    paginationModel={{ page: reduxPage, pageSize: reduxPageSize }}
                    paginationMode="server"
                    onPaginationModelChange={handlePaginationModelChange}
                    sortingMode="server"
                    sortModel={sortModel} // DataGrid 的 sortModel prop 仍然是 sortModel state
                    onSortModelChange={handleSortModelChange}
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
                onClose={() => { setConfirmOpen(false); setEditingSchedule(null); }}
                onConfirm={handleConfirmDelete}
                title="确认删除排课"
                contentText={`您确定要删除排课记录 ${editingSchedule?.courseName || ''} (ID: ${editingSchedule?.scheduleId}) 吗？`}
                isConfirming={isSubmitting}
            />
            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default AdminScheduleManagementPage;