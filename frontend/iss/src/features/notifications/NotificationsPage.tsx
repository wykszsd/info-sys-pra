// src/features/notifications/NotificationsPage.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemText,
    Divider, IconButton, Box, ButtonGroup, Button, Chip, ListItemIcon, Tooltip
} from '@mui/material';
import type { AppDispatch, RootState } from '../../store'; // Adjust path
// Adjust path
import {
    fetchUserNotifications,
    markOneNotificationAsRead,
    setNotificationsFilter,
    // fetchInitialUnreadCount, // Already fetched by MainLayout or initial load
    markAllUserNotificationsAsRead
} from './store/notificationSlice';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event'; // For schedule_change, exam
import AssignmentIcon from '@mui/icons-material/Assignment'; // For assignment
import InfoIcon from '@mui/icons-material/Info'; // For system or general
import type { Notification } from '../../types'; // 确保路径正确
// 确保路径正确
const NotificationsPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { notifications, isLoading, error, filter, unreadCount } = useSelector((state: RootState) => state.notifications);

    useEffect(() => {
        // Fetch notifications when filter changes or component mounts with a specific filter
        dispatch(fetchUserNotifications({ filter }));
        // Unread count is globally managed and fetched by MainLayout or an app init sequence
    }, [dispatch, filter]);

    const handleMarkRead = (id: number, isCurrentlyRead: boolean) => {
        if (!isCurrentlyRead) { // Only dispatch if not already read
            dispatch(markOneNotificationAsRead(id));
        }
    };

    const handleMarkAllRead = () => {
        if (unreadCount > 0) { // Only dispatch if there are unread messages
            dispatch(markAllUserNotificationsAsRead());
        }
    };

    const handleFilterChange = (newFilter: 'all' | 'unread') => {
        if (newFilter !== filter) {
            dispatch(setNotificationsFilter(newFilter));
        }
    };

    const getNotificationTypeIcon = (type: Notification['type']): React.ReactNode => {
        switch (type) {
            case 'schedule_change': return <EventIcon color="info" />;
            case 'exam': return <EventIcon color="error" />; // Or a more specific exam icon
            case 'assignment': return <AssignmentIcon color="primary" />;
            case 'system': return <InfoIcon color="secondary" />;
            default: return <NotificationsIcon color="action" />;
        }
    };

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, margin: 'auto', mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h5" component="h1" gutterBottom sx={{ mb: { xs: 1, sm: 0 } }}>
                    通知中心
                </Typography>
                <ButtonGroup size="small" aria-label="通知筛选">
                    <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => handleFilterChange('all')}>全部消息</Button>
                    <Button
                        variant={filter === 'unread' ? 'contained' : 'outlined'}
                        onClick={() => handleFilterChange('unread')}
                        startIcon={unreadCount > 0 ? <Chip label={unreadCount} size="small" color="error" sx={{ color: 'white', mr: filter === 'unread' ? 1 : -0.5 }} /> : null}
                    >
                        未读消息
                    </Button>
                </ButtonGroup>
            </Box>
            <Button
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllRead}
                disabled={isLoading || unreadCount === 0}
                sx={{ mb: 2, display: 'block', ml: 'auto' }} // Align to right
                color="primary"
            >
                全部标记为已读 ({unreadCount})
            </Button>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress />
                </Box>
            )}
            {error && !isLoading && <Alert severity="error" sx={{ mt: 2 }}>加载通知失败: {error}</Alert>}

            {!isLoading && !error && notifications.length === 0 && (
                <Typography sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
                    {filter === 'unread' ? '太棒了，没有未读通知！' : '这里空空如也，还没有任何通知。'}
                </Typography>
            )}

            {!isLoading && !error && notifications.length > 0 && (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                    {notifications.map((n, index) => (
                        <React.Fragment key={n.notificationId}>
                            <ListItem
                                alignItems="flex-start"
                                secondaryAction={
                                    !n.isRead ? (
                                        <Tooltip title="标记为已读">
                                            <IconButton edge="end" aria-label="mark as read" onClick={() => handleMarkRead(n.notificationId, n.isRead)}>
                                                <MarkEmailReadIcon color="action" />
                                            </IconButton>
                                        </Tooltip>
                                    ) : null
                                }
                                sx={{
                                    bgcolor: n.isRead ? 'action.hover' : 'transparent',
                                    transition: 'background-color 0.3s',
                                    '&:hover': { bgcolor: n.isRead ? 'action.selected' : 'primary.lighter' },
                                    cursor: !n.isRead ? 'pointer' : 'default',
                                }}
                                onClick={() => !n.isRead && handleMarkRead(n.notificationId, n.isRead)} // Click anywhere on item to mark read
                            >
                                <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                                    {getNotificationTypeIcon(n.type)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography component="div" variant="body1" color="text.primary" fontWeight={n.isRead ? 'normal' : 'bold'}>
                                            {n.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box component="div"> {/* Use Box for better layout control */}
                                            <Typography component="p" variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {n.content}
                                            </Typography>
                                            <Typography component="span" variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                                                {new Date(n.notifyTime).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })}
                                            </Typography>
                                        </Box>
                                    }
                                    // --- FIX FOR HTML NESTING ---
                                    secondaryTypographyProps={{ component: 'div' }}
                                // --- END OF FIX ---
                                />
                            </ListItem>
                            {index < notifications.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            )}
        </Paper>
    );
};

export default NotificationsPage;