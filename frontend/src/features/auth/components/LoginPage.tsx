import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, TextField, Typography, Box, CircularProgress, Alert } from '@mui/material';
import type { AppDispatch, RootState } from '../../../store';
import { loginUser } from '../store/authSlice';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

    const from = location.state?.from?.pathname || "/app"; // Redirect to previous page or /app

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Backend should handle hashing. Send plain password or what backend expects.
        // For our mock, the mock API handles a simple check.
        dispatch(loginUser({ username, password_hash: password })); // password_hash is a misnomer here for mock
    };

    return (
        <> {/* Using fragment as AuthLayout already provides Container */}
            <Typography component="h1" variant="h4" align="center" gutterBottom>
                课表管理系统
            </Typography>
            <Typography component="h2" variant="h5" align="center">
                登录
            </Typography>
            {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="用户名 (学号/工号)"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                />
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="密码"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={isLoading}
                >
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
                </Button>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    模拟用户 (密码: password):
                    <br />
                    学生: S12345 | 教师: T9876 | 管理员: admin
                </Typography>
                {/* Optional: Forgot password link */}
                {/* <Grid container justifyContent="flex-end">
          <Grid item>
            <MuiLink href="#" variant="body2">
              忘记密码?
            </MuiLink>
          </Grid>
        </Grid> */}
            </Box>
        </>
    );
};

export default LoginPage;