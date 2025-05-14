// src/features/timetable/TimetablePage.tsx
import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import type { AppDispatch, RootState } from '../../store';
import {
    fetchScheduleForWeek,
    setCurrentTimetableWeek,
    initializeTimetable,
} from './store/timetableSlice';
import WeekSelector from './components/WeekSelector';
import TimetableGrid from './components/TimetableGrid';
import ExportButton from './components/ExportButton';

const TimetablePage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const {
        currentSemester,
        currentWeek,
        // scheduleData, // 不直接作为下面 useEffect 的依赖触发请求
        allSections,
        totalSemesterWeeks,
        isLoadingInitialData,
        isLoadingSchedule,
        error,
    } = useSelector((state: RootState) => state.timetable);

    // 用于跟踪当前正在请求或已请求的周，避免重复
    const requestedWeekRef = useRef<number | null>(null);

    // 初始化 Effect (保持不变)
    useEffect(() => {
        console.log("TimetablePage: Initial mount effect, dispatching initializeTimetable.");
        dispatch(initializeTimetable());
    }, [dispatch]);

    // 获取周课表的 useEffect
    useEffect(() => {
        // 条件1: 基础数据已加载
        if (currentSemester && currentWeek && currentWeek > 0 && allSections.length > 0 && totalSemesterWeeks) {
            // 条件2: 没有在进行初始化加载
            if (!isLoadingInitialData) {
                // 条件3: 没有残留的初始化阶段错误
                if (error && (error.includes("初始化") || error.includes("学期信息") ||
                    error.includes("节次列表") ||
                    error.includes("学期总周数") ||
                    error.includes("关键数据"))) {
                    console.log("TimetablePage: Skipping fetchScheduleForWeek due to prior init error:", error);
                    // 当有初始化错误时，重置 requestedWeekRef，以便错误清除后能重新请求
                    requestedWeekRef.current = null;
                    return;
                }

                // 条件4: 当前周的数据尚未请求，或者当前周改变了，或者当前没有正在进行的周课表请求
                // isLoadingSchedule 为 false 意味着上一个请求已完成（或从未开始）
                // requestedWeekRef.current !== currentWeek 意味着这是新的一周，或者上次请求失败后重置了
                if (!isLoadingSchedule && requestedWeekRef.current !== currentWeek) {
                    console.log(`TimetablePage: Dispatching fetchScheduleForWeek. currentWeek is: ${currentWeek}, semesterId: ${currentSemester.semesterId}`); // <--- 新增日志
                    dispatch(fetchScheduleForWeek({ semesterId: currentSemester.semesterId, week: currentWeek }));
                    requestedWeekRef.current = currentWeek; // 标记已请求当前周
                }
            }
        }
    }, [
        dispatch,
        currentSemester,
        currentWeek,
        allSections.length,
        totalSemesterWeeks,
        isLoadingInitialData,
        isLoadingSchedule, // 仍然需要它作为依赖，以便在加载完成后重新评估
        error
    ]);

    const handleWeekChange = (newWeek: number) => {
        if (currentWeek !== newWeek) {
            // 当周次改变时，清除已请求标记，以便新的 useEffect 能够触发
            // requestedWeekRef.current = null; // 或者在 setCurrentTimetableWeek 的 reducer 中清除 error 时一起考虑
            dispatch(setCurrentTimetableWeek(newWeek));
        }
    };

    // ... renderContent (保持不变，使用上一轮的最新版本) ...
    const renderContent = () => {
        if (isLoadingInitialData && (!currentSemester || allSections.length === 0 || !totalSemesterWeeks)) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>正在初始化课表数据...</Typography>
                </Box>
            );
        }

        if (error && error.includes("初始化")) {
            return <Alert severity="error" sx={{ mt: 2 }}>课表数据加载失败: {error}</Alert>;
        }
        if (!currentSemester) {
            return <Alert severity="error" sx={{ mt: 2 }}>无法加载学期信息，请刷新页面重试。</Alert>;
        }
        if (allSections.length === 0) {
            return <Alert severity="warning" sx={{ mt: 2 }}>节次信息加载失败，课表可能无法正确显示。</Alert>;
        }
        if (!totalSemesterWeeks) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress color="secondary" />
                    <Typography sx={{ ml: 2 }}>正在计算学期信息...</Typography>
                </Box>
            );
        }

        // 从 state 中获取 scheduleData 用于渲染
        const scheduleDataFromState = useSelector((state: RootState) => state.timetable.scheduleData);

        return (
            <>
                <WeekSelector
                    currentSelectedWeek={currentWeek}
                    semesterInfo={currentSemester}
                    onWeekChange={handleWeekChange}
                />

                {isLoadingSchedule && currentWeek && ( // 仅当 isLoadingSchedule 为 true 时显示加载动画
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                        <CircularProgress size={30} />
                        <Typography variant="body2" sx={{ mt: 1 }}>加载第 {currentWeek} 周课表中...</Typography>
                    </Box>
                )}

                {error && !isLoadingSchedule && !error.includes("初始化") && (
                    <Alert severity="error" sx={{ my: 2 }}>
                        加载课表时发生错误: {error}
                    </Alert>
                )}

                {/* 仅当不是在加载周课表 且 有周次时 渲染课表 */}
                {currentWeek && !isLoadingSchedule && (
                    <TimetableGrid
                        scheduleDataForWeek={scheduleDataFromState} // 使用从 state 获取的数据
                        allSections={allSections}
                        currentWeek={currentWeek}
                    />
                )}
                {/* 当周无课的提示：确保不在加载中，数据为空，有当前周，且没有阻止显示的错误 */}
                {!isLoadingInitialData && !isLoadingSchedule && scheduleDataFromState.length === 0 && currentWeek && !error && (
                    <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>第 {currentWeek} 周没有课程安排。</Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <ExportButton
                        elementIdToExport="timetable-grid-export"
                        currentWeek={currentWeek}
                        disabled={isLoadingInitialData || isLoadingSchedule || scheduleDataFromState.length === 0 || !currentWeek || !!error}
                    />
                </Box>
            </>
        );
    };

    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, overflow: 'hidden' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                我的课表 {currentSemester ? `(${currentSemester.semesterName})` : ''}
            </Typography>
            {renderContent()}
        </Paper>
    );
};

export default TimetablePage;