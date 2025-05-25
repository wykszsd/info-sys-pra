// src/features/admin/AdminDashboardPage.tsx
import React, { useEffect, useRef, type JSX } from 'react';
import { Typography, Paper, Box, Grid, Card, CardActionArea, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store'; // 调整路径

// 图标导入
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';

// Redux Actions 导入
import { fetchAdminCourses } from './courses/store/adminCourseSlice';       // 调整路径
import { fetchAdminUsers } from './users/store/adminUserSlice';          // 调整路径
import { fetchAdminClassrooms } from './classrooms/store/adminClassroomSlice'; // 调整路径
import { fetchAdminSemesters } from './semesters/store/adminSemesterSlice';   // 调整路径
import { fetchPendingAdminRequests } from './requests/store/adminRequestSlice'; // 调整路径
import { fetchAdminSchedules } from './schedules/store/adminScheduleSlice';   // 调整路径


interface StatCardProps {
    title: string;
    count: number | string;
    icon: JSX.Element;
    linkTo?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, icon, linkTo }) => {
    const cardContent = (
        <Card sx={{ display: 'flex', alignItems: 'center', p: 2, height: '100%', transition: 'transform 0.2s ease-in-out', '&:hover': { transform: 'scale(1.03)' } }} elevation={3}>
            <Box sx={{ mr: 2.5, color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', borderRadius: '50%', width: 56, height: 56 }}>
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

    // 日志：组件渲染时触发
    console.log('AdminDashboardPage rendering or re-rendering...');

    // 从 Redux Store 中获取状态
    const { totalCount: totalCourses, isLoading: isLoadingCourses } = useSelector((state: RootState) => state.adminCourses);
    const { totalCount: totalUsers, isLoading: isLoadingUsers } = useSelector((state: RootState) => state.adminUsers);
    const { totalCount: totalClassrooms, isLoading: isLoadingClassrooms } = useSelector((state: RootState) => state.adminClassrooms);
    const { totalCount: totalSemesters, isLoading: isLoadingSemesters } = useSelector((state: RootState) => state.adminSemesters);
    const { pendingRequests, isLoading: isLoadingRequests } = useSelector((state: RootState) => state.adminRequests); // pendingRequests 是数组
    const { totalCount: totalSchedules, isLoading: isLoadingSchedules } = useSelector((state: RootState) => state.adminSchedules);

    // 使用 useRef 跟踪每种数据是否已尝试过初始获取
    const fetchAttemptedRef = useRef({
        courses: false,
        users: false,
        classrooms: false,
        semesters: false,
        requests: false,
        schedules: false,
    });

    useEffect(() => {
        // 日志：useEffect 回调函数执行时触发
        console.log('AdminDashboardPage useEffect CALLED. Component (re)mounted or dispatch changed (unlikely for dispatch).');
        // 使用 JSON.parse(JSON.stringify(...)) 来深拷贝 ref.current 以便正确打印其当前快照值
        console.log('Initial fetchAttemptedRef.current:', JSON.parse(JSON.stringify(fetchAttemptedRef.current)));
        console.log('Current store states:', {
            courses: { total: totalCourses, loading: isLoadingCourses, attempted: fetchAttemptedRef.current.courses },
            users: { total: totalUsers, loading: isLoadingUsers, attempted: fetchAttemptedRef.current.users },
            classrooms: { total: totalClassrooms, loading: isLoadingClassrooms, attempted: fetchAttemptedRef.current.classrooms },
            semesters: { total: totalSemesters, loading: isLoadingSemesters, attempted: fetchAttemptedRef.current.semesters },
            requests: { length: pendingRequests.length, loading: isLoadingRequests, attempted: fetchAttemptedRef.current.requests },
            schedules: { total: totalSchedules, loading: isLoadingSchedules, attempted: fetchAttemptedRef.current.schedules },
        });

        // 辅助函数，用于尝试获取数据
        const attemptFetch = (
            type: keyof typeof fetchAttemptedRef.current, // 确保 type 是 fetchAttemptedRef.current 的键
            countOrLength: number, // 可以是 totalCount 或 array.length
            isLoading: boolean,
            fetchActionCreator: (payload?: any) => any, // Action creator function
            actionPayload?: any // 可选的 payload
        ) => {
            // 只有在 未尝试过获取 并且 当前计数为0 并且 当前没有在加载中 时，才发起请求
            if (!fetchAttemptedRef.current[type] && countOrLength === 0 && !isLoading) {
                console.log(`Attempting to fetch ${type}. Conditions: !attempted (${!fetchAttemptedRef.current[type]}), countOrLength === 0 (${countOrLength === 0}), !isLoading (${!isLoading})`);
                dispatch(fetchActionCreator(actionPayload));
                fetchAttemptedRef.current[type] = true; // 关键：立即标记为已尝试，防止在同一次 effect 执行中重复
            } else {
                console.log(`Skipping fetch ${type}. Reason: Attempted: ${fetchAttemptedRef.current[type]}, Count/Length: ${countOrLength}, Loading: ${isLoading}`);
            }
        };

        // 调用辅助函数为每种数据尝试获取
        attemptFetch('courses', totalCourses, isLoadingCourses, fetchAdminCourses, { page: 0 });
        attemptFetch('users', totalUsers, isLoadingUsers, fetchAdminUsers, { page: 0 });
        attemptFetch('classrooms', totalClassrooms, isLoadingClassrooms, fetchAdminClassrooms, { page: 0 });
        attemptFetch('semesters', totalSemesters, isLoadingSemesters, fetchAdminSemesters, { page: 0 });
        attemptFetch('requests', pendingRequests.length, isLoadingRequests, fetchPendingAdminRequests); // 注意：pendingRequests.length
        attemptFetch('schedules', totalSchedules, isLoadingSchedules, fetchAdminSchedules, { page: 0 });

        // 日志：useEffect 执行完毕
        console.log('useEffect finished. Final fetchAttemptedRef.current:', JSON.parse(JSON.stringify(fetchAttemptedRef.current)));

        // 清理函数：组件卸载时执行
        return () => {
            console.log('AdminDashboardPage useEffect cleanup - COMPONENT UNMOUNTING (or dispatch changed, very unlikely)');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]); // 依赖数组严格限制为 [dispatch]，确保 effect 只在挂载时运行一次

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 64px - 48px)' /* 根据页眉/页脚调整 */ }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                管理员控制面板
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                欢迎回来！您可以在此概览系统关键数据并快速访问管理模块。
            </Typography>

            {/* Grid 布局：使用您项目验证过的正确的 Grid 写法 */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="课程总数" count={isLoadingCourses ? '...' : totalCourses} icon={<SchoolIcon />} linkTo="/app/admin/courses" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="注册用户总数" count={isLoadingUsers ? '...' : totalUsers} icon={<PeopleIcon />} linkTo="/app/admin/users" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="教室资源总数" count={isLoadingClassrooms ? '...' : totalClassrooms} icon={<MeetingRoomIcon />} linkTo="/app/admin/classrooms" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="已录入排课数" count={isLoadingSchedules ? '...' : totalSchedules} icon={<CalendarMonthIcon />} linkTo="/app/admin/schedules" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="待审批请求" count={isLoadingRequests ? '...' : pendingRequests.length} icon={<ListAltIcon />} linkTo="/app/admin/requests" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <StatCard title="学期管理" count={isLoadingSemesters ? '...' : totalSemesters} icon={<EventNoteIcon />} linkTo="/app/admin/semesters" />
                </Grid>
            </Grid>

            {/* 未来图表或快速操作的占位符 */}
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