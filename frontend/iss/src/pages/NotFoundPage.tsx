import React from 'react';
import { Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Example icon

const NotFoundPage: React.FC = () => {
    return (
        <Container component="main" maxWidth="sm" sx={{ textAlign: 'center', mt: 8, py: 4 }}>
            <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom>
                404 - 页面未找到
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                抱歉，您要查找的页面不存在或已被移动。
            </Typography>
            <Button component={RouterLink} to="/app" variant="contained" size="large">
                返回应用首页
            </Button>
        </Container>
    );
};

export default NotFoundPage;