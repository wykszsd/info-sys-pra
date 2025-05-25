// src/features/timetable/store/timetableSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { timetableApi } from '../services/timetableApi';
import type { RootState } from '../../../store';
import type { SemesterInfo, ClassSection, Schedule } from '../../../types';
import { getCurrentWeekNumber, differenceInCalendarWeeks, parseISO, startOfWeek as dateFnsStartOfWeek } from '../../../utils/dateUtils';

export interface TimetableState {
    currentSemester: SemesterInfo | null;
    currentWeek: number | null;
    totalSemesterWeeks: number | null;
    scheduleData: Schedule[];
    allSections: ClassSection[];
    isLoadingInitialData: boolean;
    isLoadingSemester: boolean;
    isLoadingSections: boolean;
    isLoadingSchedule: boolean;
    error: string | null;
    hasLoadedAllSections: boolean; // 新增
}

const initialState: TimetableState = {
    currentSemester: null,
    currentWeek: null,
    totalSemesterWeeks: null,
    scheduleData: [],
    allSections: [],
    isLoadingInitialData: false,
    isLoadingSemester: false,
    isLoadingSections: false,
    isLoadingSchedule: false,
    error: null,
    hasLoadedAllSections: false, // 初始化为 false
};

const calculateTotalSemesterWeeks = (semester: SemesterInfo | null): number => {
    if (!semester || !semester.startDate || !semester.endDate) {
        return 18; // Default
    }
    try {
        const total = differenceInCalendarWeeks(
            dateFnsStartOfWeek(parseISO(semester.endDate), { weekStartsOn: 1 }),
            dateFnsStartOfWeek(parseISO(semester.startDate), { weekStartsOn: 1 }),
            { weekStartsOn: 1 }
        ) + 1;
        return total > 0 ? total : 1;
    } catch (e) {
        console.error("Error calculating total semester weeks:", e);
        return 18;
    }
};

export const fetchCurrentSemesterInfo = createAsyncThunk<SemesterInfo, void, { state: RootState, rejectValue: string }>(
    'timetable/fetchCurrentSemester',
    async (_, { rejectWithValue }) => {
        try {
            const semester = await timetableApi.getCurrentSemester();
            if (!semester || typeof semester.semesterId === 'undefined' || !semester.semesterName || !semester.startDate || !semester.endDate) {
                console.error("fetchCurrentSemesterInfo: 获取的学期信息格式不正确或不完整。", semester);
                return rejectWithValue('获取的学期信息格式不正确。');
            }
            return semester;
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message || '无法加载当前学期信息';
            return rejectWithValue(String(errMsg).trim() || '无法加载当前学期信息');
        }
    },
    {
        condition: (_, { getState }) => {
            const { timetable } = getState();
            if (timetable.currentSemester && timetable.totalSemesterWeeks) { // If semester and total weeks are already known
                // console.log("[fetchCurrentSemesterInfo] Condition: 学期信息和总周数已存在，跳过。");
                return false;
            }
            return true;
        }
    }
);

export const fetchAllTimetableSections = createAsyncThunk<ClassSection[], void, { state: RootState, rejectValue: string }>(
    'timetable/fetchAllSections',
    async (_, { rejectWithValue }) => {
        console.log("[fetchAllTimetableSections] 开始执行 payloadCreator");
        try {
            console.log("[fetchAllTimetableSections] 调用 timetableApi.getAllClassSections");
            const sectionsOriginal = await timetableApi.getAllClassSections();
            console.log("[fetchAllTimetableSections] timetableApi.getAllClassSections 返回:", sectionsOriginal);

            if (!Array.isArray(sectionsOriginal)) {
                console.error("[fetchAllTimetableSections] 错误：API未返回节次数组。", sectionsOriginal);
                return rejectWithValue('节次数据格式不正确 (非数组)');
            }

            console.log("[fetchAllTimetableSections] 准备创建副本并校验节次数据");
            const sectionsCopy = [...sectionsOriginal];

            if (sectionsCopy.some(s => typeof s.sectionId !== 'number' || !s.startTime || !s.endTime)) {
                console.error("[fetchAllTimetableSections] 错误：部分节次数据格式不正确或缺少必要属性。", sectionsCopy);
                return rejectWithValue('部分节次数据格式不正确');
            }

            console.log("[fetchAllTimetableSections] 准备排序节次数据");
            const sortedSections = sectionsCopy.sort((a, b) => a.sectionId - b.sectionId);
            console.log("[fetchAllTimetableSections] 排序完成，返回数据");
            return sortedSections;

        } catch (error: any) {
            console.error("[fetchAllTimetableSections] payloadCreator 的 try 块中捕获到错误:", error);

            let determinedErrorMessage = '无法加载节次信息（Catch块默认）';

            if (error instanceof TypeError && error.message.includes("read only property")) {
                determinedErrorMessage = '无法处理节次数据（内部错误：只读属性）。';
            } else {
                const specificMsgFromError = error.response?.data?.message || error.message;
                if (specificMsgFromError && typeof specificMsgFromError === 'string') {
                    const trimmedMsg = String(specificMsgFromError).trim();
                    if (trimmedMsg !== '') {
                        determinedErrorMessage = trimmedMsg;
                    } else {
                        console.warn("[fetchAllTimetableSections] Catch块：从错误对象提取的消息为空或仅包含空格，将使用默认错误消息。");
                    }
                } else {
                    console.warn("[fetchAllTimetableSections] Catch块：未能从错误对象中提取有效字符串消息，将使用默认错误消息。");
                }
            }

            console.error(`[fetchAllTimetableSections] Catch块：即将 rejectWithValue, 参数为: "${determinedErrorMessage}"`);
            return rejectWithValue(determinedErrorMessage);
        }
    },
    {
        condition: (_, { getState }) => {
            const { timetable } = getState();
            if (timetable.isLoadingSections || timetable.hasLoadedAllSections) {
                console.log("[fetchAllTimetableSections] Condition: Skipping fetch (already loading or already loaded).");
                return false;
            }
            return true;
        }
    }
);

export const fetchScheduleForWeek = createAsyncThunk<
    Schedule[],
    { semesterId: number; week: number },
    { state: RootState, rejectValue: string } // 添加 state 到泛型参数
>(
    'timetable/fetchScheduleForWeek',
    async ({ semesterId, week }, { rejectWithValue }) => {
        // console.log(`[Thunk] fetchScheduleForWeek: Called for week ${week}`); // 这些日志可以保留或移除
        console.log(`[[ THUNK fetchScheduleForWeek ]] Attempting to fetch for semesterId: ${semesterId}, week: ${week}`); // <--- 新增日志
        if (!semesterId || week < 1) {
            // console.error("[Thunk] fetchScheduleForWeek: Invalid params", { semesterId, week });
            console.warn(`[[ THUNK fetchScheduleForWeek ]] Invalid parameters, semesterId: ${semesterId}, week: ${week}. Rejecting.`);
            return rejectWithValue('无效的学期或周次');
        }
        try {
            // console.log(`[Thunk] fetchScheduleForWeek: Calling API for week ${week}`);
            const schedule = await timetableApi.getMyTimetable(semesterId, week);
            // console.log(`[Thunk] fetchScheduleForWeek: API response for week ${week}`, schedule);


            if (!Array.isArray(schedule)) {
                // console.error(`[Thunk] fetchScheduleForWeek: API did not return an array for week ${week}. Received:`, schedule);
                return rejectWithValue(`第 ${week} 周课表数据格式不正确 (非数组)`);
            }
            // console.log(`[Thunk] fetchScheduleForWeek: Returning schedule for week ${week}`);
            return schedule;
        } catch (error: any) {
            // console.error(`[Thunk] fetchScheduleForWeek: Error for week ${week}`, error);
            const errMsg = error.response?.data?.message || error.message || `无法加载第 ${week} 周课表`;
            return rejectWithValue(String(errMsg).trim() || `无法加载第 ${week} 周课表`);
        }
    },
    {
        condition: ({ week }, { getState }) => { // <--- 新增 condition
            const { timetable } = getState();
            // 如果正在加载当前周，或者当前周的数据已经存在 (并且就是请求的这一周)，则不执行
            if (timetable.isLoadingSchedule && timetable.currentWeek === week) {
                // console.log(`[fetchScheduleForWeek] Condition: Already loading week ${week}, skipping.`);
                return false;
            }
            // 这个检查可以更复杂：例如，如果 scheduleData 已经有内容，并且对应的是当前请求的 week，则也可以跳过。
            // 但简单起见，主要防止因 isLoadingSchedule 变化导致的重复请求。
            // 另一个考虑是，如果 currentWeek 没变，是否真的需要重新请求？
            // 如果 currentWeek 没变，且 !isLoadingSchedule，理论上数据应该已经有了或为空。
            // 这里的 condition 主要防止在同一个加载周期内重复。
            // 如果 currentWeek 确实改变了，那么即使 isLoadingSchedule 为 false，也应该允许加载。

            // 只有当请求的周次与当前 state 中的 currentWeek 不同，
            // 或者当前正在加载的不是目标周次时，才考虑执行。
            // 但这可能会阻止因其他依赖项（如 allSections 加载完成）而触发的对同一周的首次有效加载。

            // 更简单的 condition：如果正在加载，则不重复发起。
            if (timetable.isLoadingSchedule) {
                // console.log(`[fetchScheduleForWeek] Condition: isLoadingSchedule is true, skipping.`);
                return false;
            }
            return true;
        }
    }
);

export type InitializeTimetableSuccessPayload = {
    semesterWasLoaded: boolean;
    sectionsWereLoaded: boolean;
    initialWeek: number | null;
    totalWeeks: number | null;
};

export const initializeTimetable = createAsyncThunk<
    InitializeTimetableSuccessPayload,
    void,
    { state: RootState; rejectValue: string }
>(
    'timetable/initializeTimetable',
    async (_, { dispatch, getState, rejectWithValue }) => {
        console.log("[initializeTimetable] 开始执行");
        try {
            console.log("[initializeTimetable] dispatching fetchCurrentSemesterInfo");
            const semesterResultAction = await dispatch(fetchCurrentSemesterInfo());
            console.log(
                `[initializeTimetable] fetchCurrentSemesterInfo 完成。Status: ${semesterResultAction.meta.requestStatus}, ` +
                (fetchCurrentSemesterInfo.rejected.match(semesterResultAction) ? `Error Name: ${semesterResultAction.error?.name}` : 'No error (fulfilled or aborted by own condition)')
            );
            // console.log("[initializeTimetable] fetchCurrentSemesterInfo 详细 action:", JSON.parse(JSON.stringify(semesterResultAction)));

            if (fetchCurrentSemesterInfo.rejected.match(semesterResultAction)) {
                if (semesterResultAction.error?.name !== 'ConditionError') { // 检查是否是真正的错误，而不是条件中止
                    console.error("[initializeTimetable] fetchCurrentSemesterInfo rejected with actual error:", semesterResultAction.payload, semesterResultAction.error);
                    return rejectWithValue(semesterResultAction.payload || '初始化期间加载学期信息失败(原因未知＃S)。');
                }
            }

            console.log("[initializeTimetable] dispatching fetchAllTimetableSections");
            const sectionsResultAction = await dispatch(fetchAllTimetableSections());
            console.log(
                `[initializeTimetable] fetchAllTimetableSections 完成。Status: ${sectionsResultAction.meta.requestStatus}, ` +
                (fetchAllTimetableSections.rejected.match(sectionsResultAction) ? `Error Name: ${sectionsResultAction.error?.name}` : 'No error (fulfilled or aborted by own condition)')
            );
            // console.log("[initializeTimetable] fetchAllTimetableSections 详细 action:", JSON.parse(JSON.stringify(sectionsResultAction)));

            if (fetchAllTimetableSections.rejected.match(sectionsResultAction)) {
                if (sectionsResultAction.error?.name !== 'ConditionError') { // 检查是否是真正的错误
                    console.error("[initializeTimetable] fetchAllTimetableSections rejected with actual error:", sectionsResultAction.payload, sectionsResultAction.error);
                    const payloadErrorString = sectionsResultAction.payload ? String(sectionsResultAction.payload) : '';
                    return rejectWithValue(payloadErrorString || '初始化期间加载节次信息失败(原因未知＃T)。');
                }
            }

            const currentState = getState().timetable;
            const semesterFinallyInState = !!currentState.currentSemester;
            const sectionsFinallyInState = currentState.allSections.length > 0;
            const totalWeeksFinallyInState = !!currentState.totalSemesterWeeks;

            if (!semesterFinallyInState || !sectionsFinallyInState || !totalWeeksFinallyInState) {
                let stillMissing = [];
                if (!semesterFinallyInState) stillMissing.push("学期信息");
                if (!sectionsFinallyInState) stillMissing.push("节次列表");
                if (!totalWeeksFinallyInState) stillMissing.push("学期总周数");

                const errMsg = `初始化流程结束后，以下关键数据仍然缺失: ${stillMissing.join('、')}。`;
                console.error(`[initializeTimetable] ${errMsg}`);
                const semStatus = semesterResultAction.meta.requestStatus;
                const semErrorName = fetchCurrentSemesterInfo.rejected.match(semesterResultAction) ? semesterResultAction.error?.name : 'N/A';
                const secStatus = sectionsResultAction.meta.requestStatus;
                const secErrorName = fetchAllTimetableSections.rejected.match(sectionsResultAction) ? sectionsResultAction.error?.name : 'N/A';

                console.log(`[initializeTimetable] 最终判断前的 State:`, JSON.parse(JSON.stringify(currentState)));
                console.log(`[initializeTimetable] Semester Action Status: ${semStatus}, Error Name: ${semErrorName}`);
                console.log(`[initializeTimetable] Sections Action Status: ${secStatus}, Error Name: ${secErrorName}`);
                return rejectWithValue(errMsg);
            }

            console.log("[initializeTimetable] 成功完成。State:", JSON.parse(JSON.stringify(currentState)));
            return {
                semesterWasLoaded: semesterFinallyInState,
                sectionsWereLoaded: sectionsFinallyInState,
                initialWeek: currentState.currentWeek,
                totalWeeks: currentState.totalSemesterWeeks
            };

        } catch (error: any) {
            console.error("[initializeTimetable] thunk 内部发生意外致命错误:", error);
            return rejectWithValue(error.message || '课表初始化流程中发生严重错误。');
        }
    },
    {
        condition: (_, { getState }) => {
            const { timetable } = getState();
            if (timetable.isLoadingInitialData) {
                return false;
            }
            if (timetable.currentSemester && timetable.allSections.length > 0 && timetable.totalSemesterWeeks) {
                return false;
            }
            return true;
        },
    }
);

const timetableSlice = createSlice({
    name: 'timetable',
    initialState,
    reducers: {
        setCurrentTimetableWeek: (state, action: PayloadAction<number>) => {
            if (state.totalSemesterWeeks && action.payload > 0 && action.payload <= state.totalSemesterWeeks) {
                state.currentWeek = action.payload;
                state.error = null;
            } else if (action.payload > 0 && !state.totalSemesterWeeks) {
                state.currentWeek = action.payload;
                state.error = null;
            } else {
                console.warn(`Attempted to set invalid week: ${action.payload}, total weeks: ${state.totalSemesterWeeks}`);
            }
        },
        clearTimetableState: (state) => {
            Object.assign(state, initialState);
        },
    },
    extraReducers: (builder) => {
        const appendError = (currentError: string | null, newError: string | undefined, context?: string): string => {
            const prefix = context ? `${context}: ` : '';
            if (!newError || String(newError).trim() === '') return currentError || '';

            const trimmedNewError = String(newError).trim();
            if (trimmedNewError.startsWith(prefix) && context) return (currentError ? currentError + '; ' : '') + trimmedNewError;
            return (currentError ? currentError + '; ' : '') + prefix + trimmedNewError;
        };

        builder
            .addCase(initializeTimetable.pending, (state) => {
                state.isLoadingInitialData = true;
                state.error = null;
            })
            .addCase(initializeTimetable.fulfilled, (state) => {
                state.isLoadingInitialData = false;
            })
            .addCase(initializeTimetable.rejected, (state, action) => {
                state.isLoadingInitialData = false;
                if (action.payload) {
                    state.error = appendError(null, action.payload, '初始化');
                } else if (action.error && action.error.name !== 'ConditionError' && action.error.message !== 'Aborted') {
                    // 仅当不是 ConditionError 或标准 Aborted 消息时才记录为错误
                    state.error = appendError(null, action.error.message, '初始化');
                } else if (action.error && (action.error.name === 'ConditionError' || action.error.message === 'Aborted')) {
                    // console.log("initializeTimetable aborted by condition, no global error set.");
                } else {
                    state.error = appendError(null, '发生未知初始化错误。', '初始化');
                }
            })
            .addCase(fetchCurrentSemesterInfo.pending, (state) => {
                state.isLoadingSemester = true;
                if (!state.isLoadingInitialData) state.error = null;
            })
            .addCase(fetchCurrentSemesterInfo.fulfilled, (state, action) => {
                state.isLoadingSemester = false;
                state.currentSemester = action.payload;

                const totalWeeks = calculateTotalSemesterWeeks(action.payload);
                state.totalSemesterWeeks = totalWeeks;

                if (action.payload?.startDate) {
                    let calculatedWeek = getCurrentWeekNumber(action.payload.startDate);
                    if (calculatedWeek === null || calculatedWeek <= 0) {
                        calculatedWeek = 1;
                    }
                    state.currentWeek = Math.min(Math.max(1, calculatedWeek), totalWeeks);
                } else {
                    state.currentWeek = 1;
                }

                if (!state.isLoadingInitialData && state.error && state.error.includes('学期信息')) {
                    state.error = null;
                }
            })
            .addCase(fetchCurrentSemesterInfo.rejected, (state, action) => {
                state.isLoadingSemester = false;
                if (action.error.name !== 'ConditionError') { // 之前是 action.error.message !== 'Aborted'
                    if (!state.isLoadingInitialData) {
                        state.error = appendError(state.error, action.payload, '学期信息');
                    }
                    state.currentSemester = null;
                    state.currentWeek = null;
                    state.totalSemesterWeeks = null;
                }
            })
            .addCase(fetchAllTimetableSections.pending, (state) => {
                state.isLoadingSections = true;
                if (!state.isLoadingInitialData) state.error = null;
            })
            .addCase(fetchAllTimetableSections.fulfilled, (state, action) => {
                state.isLoadingSections = false;
                state.allSections = action.payload;
                state.hasLoadedAllSections = true; // 成功加载后设为 true
                if (!state.isLoadingInitialData && state.error && state.error.includes('节次信息')) {
                    state.error = null;
                }
            })
            .addCase(fetchAllTimetableSections.rejected, (state, action) => {
                state.isLoadingSections = false;
                state.allSections = [];
                state.hasLoadedAllSections = false; // 加载失败后设为 false，允许重试
                if (action.error.name !== 'ConditionError') { // 之前是 action.error.message !== 'Aborted'
                    if (!state.isLoadingInitialData) {
                        state.error = appendError(state.error, action.payload, '节次信息');
                    }
                    state.allSections = [];
                }
            })
            .addCase(fetchScheduleForWeek.pending, (state) => {
                state.isLoadingSchedule = true;
                state.error = null;
                state.scheduleData = [];
            })
            .addCase(fetchScheduleForWeek.fulfilled, (state, action) => {
                state.isLoadingSchedule = false;
                state.scheduleData = action.payload;
            })
            .addCase(fetchScheduleForWeek.rejected, (state, action) => {
                state.isLoadingSchedule = false;
                state.error = appendError(null, action.payload, '周课表');
                state.scheduleData = [];
            });
    },
});

export const { setCurrentTimetableWeek, clearTimetableState } = timetableSlice.actions;
export default timetableSlice.reducer;