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
        allSections,
        totalSemesterWeeks,
        isLoadingInitialData,
        isLoadingSchedule,
        error,
        // scheduleData, // 不直接作为下面 useEffect 的依赖触发请求
    } = useSelector((state: RootState) => state.timetable);

    // 用于跟踪当前正在请求或已请求的周，避免重复
    const requestedWeekRef = useRef<number | null>(null);

    // 初始化 Effect
    useEffect(() => {
        // console.log("TimetablePage: Initial mount effect, dispatching initializeTimetable.");
        dispatch(initializeTimetable());
    }, [dispatch]);

    // 获取周课表的 useEffect
    useEffect(() => {
        // console.log("TimetablePage: Schedule fetch effect triggered. Deps:", { currentSemester, currentWeek, allSectionsLength: allSections.length, totalSemesterWeeks, isLoadingInitialData, isLoadingSchedule, error });
        // 条件1: 基础数据已加载
        if (currentSemester && currentWeek && currentWeek > 0 && allSections.length > 0 && totalSemesterWeeks) {
            // 条件2: 没有在进行初始化加载
            if (!isLoadingInitialData) {
                // 条件3: 没有残留的、会阻止周课表获取的初始化阶段错误
                if (error && (error.includes("初始化") || error.includes("学期信息") ||
                    error.includes("节次列表") ||
                    error.includes("学期总周数") ||
                    error.includes("关键数据"))) {
                    // console.log("TimetablePage: Skipping fetchScheduleForWeek due to prior init error:", error);
                    // 当有初始化错误时，重置 requestedWeekRef，以便错误清除后能重新请求
                    requestedWeekRef.current = null;
                    return;
                }

                // 条件4: 当前周的数据尚未请求 (requestedWeekRef.current !== currentWeek)，
                // 或者当前没有正在进行的周课表请求 (!isLoadingSchedule)
                if (!isLoadingSchedule && requestedWeekRef.current !== currentWeek) {
                    // console.log(`TimetablePage: Dispatching fetchScheduleForWeek. currentWeek is: ${currentWeek}, semesterId: ${currentSemester.semesterId}, requestedWeekRef: ${requestedWeekRef.current}`);
                    dispatch(fetchScheduleForWeek({ semesterId: currentSemester.semesterId, week: currentWeek }));
                    requestedWeekRef.current = currentWeek; // 标记已请求当前周
                } else {
                    // console.log(`TimetablePage: Conditions not met for dispatching fetchScheduleForWeek. isLoadingSchedule: ${isLoadingSchedule}, requestedWeekRef: ${requestedWeekRef.current}, currentWeek: ${currentWeek}`);
                }
            } else {
                // console.log("TimetablePage: Skipping schedule fetch because initial data is still loading.");
            }
        } else {
            // console.log("TimetablePage: Skipping schedule fetch because core data (semester, week, sections, totalWeeks) is not ready.");
            // 如果 currentWeek 变为 null (例如，在错误和状态重置之后)，确保 requestedWeekRef 也被重置
            if (!currentWeek) {
                requestedWeekRef.current = null;
            }
        }
    }, [
        dispatch,
        currentSemester,
        currentWeek,
        allSections.length, // 使用 .length 作为依赖是安全的
        totalSemesterWeeks,
        isLoadingInitialData,
        isLoadingSchedule, // 关键依赖：当请求完成时，此项会改变，允许 effect 重新评估
        error, // 关键依赖：当错误状态改变时（例如被清除），允许 effect 重新评估
    ]);

    const handleWeekChange = (newWeek: number) => {
        // console.log(`TimetablePage: handleWeekChange called with newWeek: ${newWeek}, currentWeek from state: ${currentWeek}, error state: ${error}`);
        if (currentWeek !== newWeek) {
            // console.log("TimetablePage: Week changed. Resetting requestedWeekRef and dispatching setCurrentTimetableWeek.");
            requestedWeekRef.current = null; // 关键：周次改变，重置 ref 以允许获取新周数据
            dispatch(setCurrentTimetableWeek(newWeek));
        } else {
            // 如果用户点击的是当前已选中的周，并且之前有错误，这可能是一次重试尝试
            if (error) {
                // console.log("TimetablePage: Same week clicked with existing error. Resetting requestedWeekRef to allow retry.");
                requestedWeekRef.current = null; // 关键：允许为当前周重试（如果之前有错误）
            }
            // 即使是同一周，也 dispatch，因为 setCurrentTimetableWeek reducer 会清除错误状态
            // console.log("TimetablePage: Dispatching setCurrentTimetableWeek for the same week (possibly to clear error).");
            dispatch(setCurrentTimetableWeek(newWeek));
        }
    };

    const renderContent = () => {
        // console.log("TimetablePage: renderContent called. isLoadingInitialData:", isLoadingInitialData, "currentSemester:", !!currentSemester, "allSections.length:", allSections.length, "totalSemesterWeeks:", totalSemesterWeeks, "error:", error);
        if (isLoadingInitialData && (!currentSemester || allSections.length === 0 || !totalSemesterWeeks)) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>正在初始化课表数据...</Typography>
                </Box>
            );
        }

        // 检查是否存在阻止继续的初始化错误
        if (error && (error.includes("初始化") || (!currentSemester && error.includes("学期信息")))) {
            return <Alert severity="error" sx={{ mt: 2 }}>课表数据加载失败: {error}</Alert>;
        }

        // 检查关键数据是否缺失（在没有主要初始化错误的情况下）
        if (!currentSemester) {
            return <Alert severity="warning" sx={{ mt: 2 }}>当前学期信息未加载，无法显示课表。请稍后或尝试刷新。</Alert>;
        }
        if (allSections.length === 0 && !error?.includes("节次列表")) { // 仅当没有覆盖性的节次列表错误时显示此警告
            return <Alert severity="warning" sx={{ mt: 2 }}>节次信息加载中或加载失败，课表可能无法正确显示。</Alert>;
        }
        if (!totalSemesterWeeks && !error?.includes("学期总周数")) { // 仅当没有覆盖性的学期总周数错误时显示此加载状态
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress color="secondary" />
                    <Typography sx={{ ml: 2 }}>正在计算学期周数...</Typography>
                </Box>
            );
        }

        // 从 state 中获取 scheduleData 用于渲染
        const scheduleDataFromState = useSelector((state: RootState) => state.timetable.scheduleData);
        // console.log("TimetablePage: renderContent - scheduleDataFromState.length:", scheduleDataFromState.length, "isLoadingSchedule:", isLoadingSchedule, "currentWeek:", currentWeek, "error (non-init):", error && !error.includes("初始化"));

        return (
            <>
                <WeekSelector
                    currentSelectedWeek={currentWeek}
                    semesterInfo={currentSemester}
                    onWeekChange={handleWeekChange}
                />

                {/* 周课表加载动画 */}
                {isLoadingSchedule && currentWeek && (
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                        <CircularProgress size={30} />
                        <Typography variant="body2" sx={{ mt: 1 }}>加载第 {currentWeek} 周课表中...</Typography>
                    </Box>
                )}

                {/* 非初始化阶段的错误提示 */}
                {error && !isLoadingSchedule && !(error.includes("初始化") || (!currentSemester && error.includes("学期信息"))) && (
                    <Alert severity="error" sx={{ my: 2 }}>
                        加载课表时发生错误: {error}
                    </Alert>
                )}

                {/* 课表网格：仅当核心数据准备好且不是在加载周课表时渲染 */}
                {currentWeek && currentSemester && allSections.length > 0 && totalSemesterWeeks && !isLoadingSchedule && (
                    <TimetableGrid
                        scheduleDataForWeek={scheduleDataFromState}
                        allSections={allSections}
                        currentWeek={currentWeek}
                    />
                )}

                {/* 当周无课的提示 */}
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