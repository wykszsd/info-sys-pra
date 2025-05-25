import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingPage: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh', // Full viewport height
                width: '100vw',  // Full viewport width
                position: 'fixed', // Cover everything
                top: 0,
                left: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: semi-transparent overlay
                zIndex: (theme) => theme.zIndex.drawer + 100, // Ensure it's on top
            }}
        >
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2, color: 'text.secondary' }}>加载中，请稍候...</Typography>
        </Box>
    );
};

export default LoadingPage;