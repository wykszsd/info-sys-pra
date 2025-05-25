import React from 'react';
import { Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block'; // Example icon
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    return (
        <Container component="main" maxWidth="sm" sx={{ textAlign: 'center', mt: 8, py: 4 }}>
            <BlockIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
                访问受限
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                抱歉，您没有权限访问此页面。
            </Typography>
            <Button
                onClick={() => navigate(isAuthenticated ? '/app' : '/login')} // Navigate back or to login
                variant="contained"
                size="large"
            >
                {isAuthenticated ? '返回应用首页' : '前往登录'}
            </Button>
        </Container>
    );
};

export default UnauthorizedPage;