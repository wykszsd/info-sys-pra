// src/layouts/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Box, CssBaseline, Divider, Tooltip, Avatar, Menu, MenuItem, Badge, LinearProgress, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
// Role-based icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SendIcon from '@mui/icons-material/Send';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EventNoteIcon from '@mui/icons-material/EventNote';

import { type AppDispatch, type RootState } from '../store';
import { logoutUser, fetchUserOnLoad } from '../features/auth/store/authSlice';
// Import clear actions for all relevant slices
import {
    clearTimetableState,
    initializeTimetable,
    type InitializeTimetableSuccessPayload // Import the payload type
} from '../features/timetable/store/timetableSlice';
import { clearSharedDataState, fetchAllCoursesShortList, fetchAllTeachersList, fetchAllClassroomsShortList } from '../store/sharedDataSlice';
import { clearCourseSelectionState } from '../features/courses/store/courseSelectionSlice';
import { clearExamState } from '../features/exams/store/examSlice';
import { clearNotificationsState, fetchUnreadCount } from '../features/notifications/store/notificationSlice';
import { clearRequestState } from '../features/requests/store/requestSlice';
import { clearAssignmentState } from '../features/assignments/store/assignmentSlice';
// Admin clear actions
import { clearAdminCourseState } from '../features/admin/courses/store/adminCourseSlice';
import { clearAdminClassroomState } from '../features/admin/classrooms/store/adminClassroomSlice';
import { clearAdminSemesterState } from '../features/admin/semesters/store/adminSemesterSlice';
import { clearAdminUserState } from '../features/admin/users/store/adminUserSlice';
import { clearAdminScheduleState } from '../features/admin/schedules/store/adminScheduleSlice';
import { clearAdminRequestState } from '../features/admin/requests/store/adminRequestSlice';


const drawerWidth = 250;

const MainLayout: React.FC = () => {
    const [open, setOpen] = useState(true);
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const dispatch: AppDispatch = useDispatch();
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { unreadCount: unreadNotifications } = useSelector((state: RootState) => state.notifications);
    const sharedData = useSelector((state: RootState) => state.sharedData);
    const isSharedDataLoading = sharedData.isLoading.courses || sharedData.isLoading.teachers || sharedData.isLoading.classrooms;
    const theme = useTheme();

    const timetableIsLoadingInitial = useSelector((state: RootState) => state.timetable.isLoadingInitialData);

    useEffect(() => {
        if (token && !user) {
            dispatch(fetchUserOnLoad());
        }
        if (user) {
            dispatch(fetchUnreadCount());
        }
    }, [dispatch, token, user]);

    // useEffect for initializing timetable and shared data
    useEffect(() => {
        if (user) {
            console.log("MainLayout useEffect [Data Init]: User is present. Dispatching initial data loads if necessary.");

            dispatch(initializeTimetable())
                .unwrap()
                .then((fulfilledPayload: InitializeTimetableSuccessPayload) => {
                    // This block executes if the initializeTimetable thunk is fulfilled
                    console.log("MainLayout: initializeTimetable was fulfilled with payload:", fulfilledPayload);
                    // Example: if (fulfilledPayload.semesterWasLoaded) { /* do something */ }
                })
                .catch(rejectedValueOrError => {
                    // This block executes if the promise from unwrap() is rejected.
                    // This can be due to:
                    // 1. The thunk's condition returning false (rejectedValueOrError.name === 'ConditionError')
                    // 2. The thunk's payloadCreator calling rejectWithValue(value) (rejectedValueOrError will be 'value')
                    // 3. An unhandled error within the payloadCreator (rejectedValueOrError will be an Error object)
                    if (rejectedValueOrError && rejectedValueOrError.name === 'ConditionError') {
                        console.log("MainLayout: initializeTimetable was aborted by its own condition. Message:", rejectedValueOrError.message);
                    } else {
                        console.error("MainLayout: initializeTimetable was rejected with value/error:", rejectedValueOrError);
                    }
                });

            // Shared data fetching - these thunks should have their own conditions too
            if (sharedData.allCoursesShort.length === 0 && !sharedData.isLoading.courses) {
                console.log("MainLayout useEffect [Data Init]: Fetching courses short list.");
                dispatch(fetchAllCoursesShortList());
            }
            if (sharedData.allTeachers.length === 0 && !sharedData.isLoading.teachers) {
                console.log("MainLayout useEffect [Data Init]: Fetching teachers list.");
                dispatch(fetchAllTeachersList());
            }
            if (sharedData.allClassroomsShort.length === 0 && !sharedData.isLoading.classrooms) {
                console.log("MainLayout useEffect [Data Init]: Fetching classrooms short list.");
                dispatch(fetchAllClassroomsShortList());
            }
        }
    }, [dispatch, user]); // Only re-run if dispatch or user changes


    const handleDrawerOpen = () => setOpen(true);
    const handleDrawerClose = () => setOpen(false);
    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);

    const handleLogout = () => {
        handleCloseUserMenu();
        dispatch(logoutUser());
        dispatch(clearTimetableState());
        dispatch(clearSharedDataState());
        dispatch(clearCourseSelectionState());
        dispatch(clearExamState());
        dispatch(clearNotificationsState());
        dispatch(clearRequestState());
        dispatch(clearAssignmentState());
        dispatch(clearAdminCourseState());
        dispatch(clearAdminClassroomState());
        dispatch(clearAdminSemesterState());
        dispatch(clearAdminUserState());
        dispatch(clearAdminScheduleState());
        dispatch(clearAdminRequestState());
        navigate('/login');
    };

    const getNavItems = () => {
        const baseCommon = [
            { text: '仪表盘', icon: <DashboardIcon />, path: '/app', roles: ['student', 'teacher', 'admin'] },
            { text: '通知中心', icon: <NotificationsIcon />, path: '/app/notifications', roles: ['student', 'teacher', 'admin'] },
        ];
        const studentNav = [
            { text: '我的课表', icon: <CalendarMonthIcon />, path: '/app/timetable', roles: ['student'] },
            { text: '选课中心', icon: <SchoolIcon />, path: '/app/select-courses', roles: ['student'] },
            { text: '空教室查询', icon: <MeetingRoomIcon />, path: '/app/find-classrooms', roles: ['student', 'teacher'] },
            { text: '我的考试', icon: <EventNoteIcon />, path: '/app/my-exams', roles: ['student'] },
        ];
        const teacherNav = [
            { text: '我的教学安排', icon: <CalendarMonthIcon />, path: '/app/my-courses-taught', roles: ['teacher'] },
            { text: '我的课表视图', icon: <CalendarMonthIcon />, path: '/app/timetable', roles: ['teacher'] },
            { text: '提交申请', icon: <SendIcon />, path: '/app/submit-request', roles: ['teacher'] },
            { text: '我的申请', icon: <ListAltIcon />, path: '/app/my-requests', roles: ['teacher'] },
            { text: '发布作业', icon: <AssignmentIcon />, path: '/app/assignments/post', roles: ['teacher'] },
            { text: '我的监考', icon: <EventNoteIcon />, path: '/app/my-exams', roles: ['teacher'] },
        ];
        const adminNav = [
            { text: '管理仪表盘', icon: <AdminPanelSettingsIcon />, path: '/app/admin-dashboard', roles: ['admin'] },
            { text: '课程管理', icon: <SchoolIcon />, path: '/app/admin/courses', roles: ['admin'] },
            { text: '教室管理', icon: <MeetingRoomIcon />, path: '/app/admin/classrooms', roles: ['admin'] },
            { text: '学期管理', icon: <EventNoteIcon />, path: '/app/admin/semesters', roles: ['admin'] },
            { text: '用户管理', icon: <PeopleIcon />, path: '/app/admin/users', roles: ['admin'] },
            { text: '排课管理', icon: <CalendarMonthIcon />, path: '/app/admin/schedules', roles: ['admin'] },
            { text: '请求审批', icon: <ListAltIcon />, path: '/app/admin/requests', roles: ['admin'] },
        ];

        let items = [...baseCommon];
        if (user?.role === 'student') items = items.concat(studentNav.filter(item => item.roles.includes('student')));
        if (user?.role === 'teacher') items = items.concat(teacherNav.filter(item => item.roles.includes('teacher')));
        if (user?.role === 'admin') items = items.concat(adminNav.filter(item => item.roles.includes('admin')));

        const uniqueItems = Array.from(new Set(items.map(item => item.path)))
            .map(path => items.find(item => item.path === path)!);

        return uniqueItems.filter(item => item.roles.includes(user?.role || ''));
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton color="inherit" aria-label="open drawer" onClick={handleDrawerOpen} edge="start" sx={{ mr: 2, ...(open && { display: 'none' }) }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        智能化课表管理系统
                    </Typography>
                    <IconButton color="inherit" component={RouterLink} to="/app/notifications" sx={{ mr: 1 }}>
                        <Badge badgeContent={unreadNotifications} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <Tooltip title="用户设置">
                        <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                            <Avatar alt={user?.username || 'User'} />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={anchorElUser}
                        open={Boolean(anchorElUser)}
                        onClose={handleCloseUserMenu}
                    >
                        <MenuItem component={RouterLink} to="/app/profile" onClick={handleCloseUserMenu}>
                            <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                            个人中心
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                            退出登录
                        </MenuItem>
                    </Menu>
                </Toolbar>
                {(isSharedDataLoading || timetableIsLoadingInitial) && <LinearProgress color="secondary" sx={{ position: 'absolute', bottom: 0, width: '100%' }} />}
            </AppBar>
            <Drawer
                variant="permanent"
                open={open}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        ...(!open && {
                            overflowX: 'hidden',
                            width: (theme) => theme.spacing(7),
                            [theme.breakpoints.up('sm')]: {
                                width: (theme) => theme.spacing(9),
                            },
                        }),
                    },
                }}
            >
                <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1], }} >
                    <Typography variant="subtitle1" sx={{ flexGrow: 1, pl: 2, opacity: open ? 1 : 0, transition: (theme) => theme.transitions.create('opacity') }}>菜单</Typography>
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <Divider />
                <List>
                    {getNavItems().map((item) => (
                        <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                            <ListItemButton component={RouterLink} to={item.path} sx={{ minHeight: 48, justifyContent: open ? 'initial' : 'center', px: 2.5, }} title={item.text} >
                                <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : 'auto', justifyContent: 'center', }}> {item.icon} </ListItemIcon>
                                <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0, transition: (theme) => theme.transitions.create('opacity') }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;