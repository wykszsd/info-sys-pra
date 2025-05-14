// src/features/admin/AdminDashboardPage.tsx
import React, { useEffect, type JSX } from 'react';
import { Typography, Paper, Box, Grid, Card, CardActionArea, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store'; // Adjust path
// Adjust path
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart'; // Example for stats

// Import actions to fetch counts if not loaded by default page loads
import { fetchAdminCourses } from './courses/store/adminCourseSlice';
import { fetchAdminUsers } from './users/store/adminUserSlice';
import { fetchAdminClassrooms } from './classrooms/store/adminClassroomSlice';
import { fetchAdminSemesters } from './semesters/store/adminSemesterSlice';
import { fetchPendingAdminRequests } from './requests/store/adminRequestSlice';
import { fetchAdminSchedules } from './schedules/store/adminScheduleSlice';


interface StatCardProps {
    title: string;
    count: number | string;
    icon: JSX.Element; // Changed from React.ReactNode to JSX.Element
    linkTo?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, icon, linkTo }) => {
    const cardContent = (
        <Card sx={{ display: 'flex', alignItems: 'center', p: 2, height: '100%', transition: 'transform 0.2s ease-in-out', '&:hover': { transform: 'scale(1.03)' } }} elevation={3}>
            <Box sx={{ mr: 2.5, color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', borderRadius: '50%', width: 56, height: 56 }}>
                {/* Removed 'as React.ReactElement' cast as icon is now JSX.Element */}
                {React.cloneElement(icon, { sx: { fontSize: 30 } })}
            </Box>
            <Box>
                <Typography variant="h5" component="div" fontWeight="bold">{count}</Typography>
                <Typography color="text.secondary" variant="subtitle2">{title}</Typography>
            </Box>
        </Card>
    );

    return linkTo ? (
        <MuiLink component={RouterLink} to={linkTo} sx={{ textDecoration: 'none', display: 'block', height: '100%' }}>
            <CardActionArea sx={{ height: '100%' }}>
                {cardContent}
            </CardActionArea>
        </MuiLink>
    ) : cardContent;
};


const AdminDashboardPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();

    // Fetch counts or totals from various admin slices
    // Ensure these slices have `totalCount` or equivalent for list items
    const { totalCount: totalCourses, isLoading: isLoadingCourses } = useSelector((state: RootState) => state.adminCourses);
    const { totalCount: totalUsers, isLoading: isLoadingUsers } = useSelector((state: RootState) => state.adminUsers);
    const { totalCount: totalClassrooms, isLoading: isLoadingClassrooms } = useSelector((state: RootState) => state.adminClassrooms);
    const { totalCount: totalSemesters, isLoading: isLoadingSemesters } = useSelector((state: RootState) => state.adminSemesters);
    const { pendingRequests, isLoading: isLoadingRequests } = useSelector((state: RootState) => state.adminRequests);
    const { totalCount: totalSchedules, isLoading: isLoadingSchedules } = useSelector((state: RootState) => state.adminSchedules);


    useEffect(() => {
        // Dispatch actions to fetch initial data for dashboard cards if not already loaded
        // These fetches are for the counts/totals shown on the dashboard.
        // The actual list pages will do their own full fetches.
        // We fetch page 1, size 1 to just get the totalCount typically returned by APIs.
        // Or, backend could provide dedicated /stats endpoints.
        if (totalCourses === 0 && !isLoadingCourses) dispatch(fetchAdminCourses({ page: 0 }));
        if (totalUsers === 0 && !isLoadingUsers) dispatch(fetchAdminUsers({ page: 0 }));
        if (totalClassrooms === 0 && !isLoadingClassrooms) dispatch(fetchAdminClassrooms({ page: 0 }));
        if (totalSemesters === 0 && !isLoadingSemesters) dispatch(fetchAdminSemesters({ page: 0 }));
        if (pendingRequests.length === 0 && !isLoadingRequests) dispatch(fetchPendingAdminRequests()); // Fetches list to get length
        if (totalSchedules === 0 && !isLoadingSchedules) dispatch(fetchAdminSchedules({ page: 0 }));

    }, [dispatch, totalCourses, totalUsers, totalClassrooms, totalSemesters, pendingRequests.length, totalSchedules,
        isLoadingCourses, isLoadingUsers, isLoadingClassrooms, isLoadingSemesters, isLoadingRequests, isLoadingSchedules]);

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 64px - 48px)' /* Adjust based on header/footer */ }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                管理员控制面板
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                欢迎回来！您可以在此概览系统关键数据并快速访问管理模块。
            </Typography>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="课程总数" count={isLoadingCourses ? '...' : totalCourses} icon={<SchoolIcon />} linkTo="/app/admin/courses" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="注册用户总数" count={isLoadingUsers ? '...' : totalUsers} icon={<PeopleIcon />} linkTo="/app/admin/users" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="教室资源总数" count={isLoadingClassrooms ? '...' : totalClassrooms} icon={<MeetingRoomIcon />} linkTo="/app/admin/classrooms" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="已录入排课数" count={isLoadingSchedules ? '...' : totalSchedules} icon={<CalendarMonthIcon />} linkTo="/app/admin/schedules" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="待审批请求" count={isLoadingRequests ? '...' : pendingRequests.length} icon={<ListAltIcon />} linkTo="/app/admin/requests" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}> {/* Adjusted for standard MUI Grid item props (if applicable) */}
                    <StatCard title="学期管理" count={isLoadingSemesters ? '...' : totalSemesters} icon={<EventNoteIcon />} linkTo="/app/admin/semesters" />
                </Grid>
            </Grid>

            {/* Placeholder for future charts or quick actions */}
            <Box sx={{ mt: 5, borderTop: '1px solid #eee', pt: 3 }}>
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BarChartIcon sx={{ mr: 1, color: 'text.secondary' }} /> 系统活动概览 (待开发)
                </Typography>
                <Typography color="text.secondary">
                    此处可以集成图表展示系统使用频率、资源分配情况等统计信息。
                </Typography>
            </Box>
        </Paper>
    );
};

export default AdminDashboardPage;