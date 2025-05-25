import React from 'react';
import { Typography, Paper, Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
// Icons for quick links
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SendIcon from '@mui/icons-material/Send';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';

const DashboardPage: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);

    const studentLinks = [
        { text: '查看我的课表', path: '/app/timetable', icon: <CalendarMonthIcon /> },
        { text: '进入选课中心', path: '/app/select-courses', icon: <SchoolIcon /> },
        { text: '查询空教室', path: '/app/find-classrooms', icon: <MeetingRoomIcon /> },
        { text: '查看考试安排', path: '/app/my-exams', icon: <EventNoteIcon /> },
    ];

    const teacherLinks = [
        { text: '查看教学安排', path: '/app/my-courses-taught', icon: <CalendarMonthIcon /> },
        { text: '提交申请 (调课/考试)', path: '/app/submit-request', icon: <SendIcon /> },
        { text: '查看我的申请', path: '/app/my-requests', icon: <ListAltIcon /> },
        { text: '发布作业通知', path: '/app/assignments/post', icon: <AssignmentIcon /> },
        { text: '查询空教室', path: '/app/find-classrooms', icon: <MeetingRoomIcon /> },
    ];

    const adminLinks = [
        { text: '课程管理', path: '/app/admin/courses', icon: <SchoolIcon /> },
        { text: '教室管理', path: '/app/admin/classrooms', icon: <MeetingRoomIcon /> },
        { text: '学期管理', path: '/app/admin/semesters', icon: <EventNoteIcon /> },
        { text: '用户管理', path: '/app/admin/users', icon: <PeopleIcon /> },
        { text: '排课管理', path: '/app/admin/schedules', icon: <CalendarMonthIcon /> },
        { text: '请求审批', path: '/app/admin/requests', icon: <ListAltIcon /> },
    ];

    let linksToShow: { text: string, path: string, icon: React.ReactNode }[] = [];
    if (user?.role === 'student') linksToShow = studentLinks;
    else if (user?.role === 'teacher') linksToShow = teacherLinks;
    else if (user?.role === 'admin') linksToShow = adminLinks;

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, minHeight: '70vh' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                欢迎回来, {user?.username || '用户'}!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                这里是您的系统仪表盘。您可以从下方快速访问常用功能，或使用左侧导航栏浏览更多选项。
            </Typography>

            {linksToShow.length > 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom>快捷导航:</Typography>
                    <List dense>
                        {linksToShow.map((link) => (
                            <ListItem key={link.path} disablePadding
                                component={RouterLink}
                                to={link.path}
                                sx={{
                                    color: 'primary.main',
                                    '&:hover': { backgroundColor: 'action.hover' },
                                    borderRadius: 1,
                                    mb: 0.5
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'primary.dark' }}>{link.icon}</ListItemIcon>
                                <ListItemText primary={link.text} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {/* TODO: Add more dashboard widgets or information cards based on role */}
            {/* For example: Upcoming classes/exams for students/teachers, pending requests for admin */}
            <Box sx={{ mt: 5, borderTop: '1px solid #eee', pt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    系统当前时间: {new Date().toLocaleString()}
                </Typography>
                {/* Add more system info or announcements here */}
            </Box>
        </Paper>
    );
};

export default DashboardPage;