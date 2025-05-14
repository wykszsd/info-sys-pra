import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Box } from '@mui/material';

const AuthLayout: React.FC = () => {
    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Outlet /> {/* Renders LoginPage etc. */}
            </Box>
        </Container>
    );
};

export default AuthLayout;