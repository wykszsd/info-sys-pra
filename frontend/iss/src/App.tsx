import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { store } from './store';
import { router } from './router';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // For date-fns v3
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { zhCN } from 'date-fns/locale/zh-CN';
// DatePicker locale
import LoadingPage from './pages/LoadingPage';
import React from 'react';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // Example blue
        },
        secondary: {
            main: '#dc004e', // Example pink
        },
    },
    // typography, components overrides can go here
});

function App() {
    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
                    <CssBaseline />
                    <React.Suspense fallback={<LoadingPage />}>
                        <RouterProvider router={router} />
                    </React.Suspense>

                </LocalizationProvider>
            </ThemeProvider>
        </Provider>
    );
}

export default App;