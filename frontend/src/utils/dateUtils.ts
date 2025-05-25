// src/utils/dateUtils.ts
import {
    differenceInCalendarWeeks,
    startOfWeek,
    addWeeks,
    format,
    parseISO,
    isValid,
    getWeek,
    isBefore,
    startOfDay,
    differenceInDays,
    addDays, // <<< 直接从 date-fns 导入并导出
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const getCurrentWeekNumber = (
    semesterStartDateString: string,
    currentDate: Date = new Date()
): number | null => {
    try {
        const semesterStartDate = parseISO(semesterStartDateString);
        if (!isValid(semesterStartDate) || !isValid(currentDate)) {
            console.error("Invalid date provided to getCurrentWeekNumber", semesterStartDateString, currentDate);
            return null;
        }
        const startOfSemesterWeek = startOfWeek(semesterStartDate, { weekStartsOn: 1 });
        const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekNumber = differenceInCalendarWeeks(startOfCurrentWeek, startOfSemesterWeek, {
            weekStartsOn: 1,
        }) + 1;
        return weekNumber > 0 ? weekNumber : null;
    } catch (error) {
        console.error("Error calculating week number:", error);
        return null;
    }
};

export const getWeekDates = (
    semesterStartDateString: string,
    weekNumber: number
): { start: Date; end: Date } | null => {
    try {
        const semesterStartDate = parseISO(semesterStartDateString);
        if (!isValid(semesterStartDate) || weekNumber < 1) {
            return null;
        }
        const startOfSemesterWeekOne = startOfWeek(semesterStartDate, { weekStartsOn: 1 });
        const targetWeekStartDate = addWeeks(startOfSemesterWeekOne, weekNumber - 1);
        const targetWeekEndDate = addDays(targetWeekStartDate, 6); // <<< 使用导入的 addDays
        return { start: targetWeekStartDate, end: targetWeekEndDate };
    } catch (error) {
        console.error("Error calculating week dates:", error);
        return null;
    }
};

export const formatDateToYMD = (date: Date | number | string): string => { // Renamed for clarity
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
        if (!isValid(dateObj)) return "Invalid Date";
        return format(dateObj, 'yyyy-MM-dd', { locale: zhCN });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Format Error";
    }
};
// Keep formatDate if used elsewhere for other formats
export const formatDate = (date: Date | number | string, formatString: string = 'yyyy-MM-dd'): string => {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
        if (!isValid(dateObj)) return "Invalid Date";
        return format(dateObj, formatString, { locale: zhCN });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Format Error";
    }
};


export const getDayOfWeekNum = (date: Date): number => { // Renamed for clarity
    const day = date.getDay();
    return day === 0 ? 7 : day;
};

export const getISOWeekNumber = (date: Date): number => { // Renamed for clarity
    return getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
};

export const isDateRangeValid = (
    startDate: Date | null,
    endDate: Date | null,
    maxDays: number = 7
): { valid: boolean, error?: string } => {
    if (!startDate || !endDate) return { valid: false, error: "请选择开始和结束日期。" };

    const today = startOfDay(new Date());
    // Allow start date to be today
    if (isBefore(startOfDay(startDate), today)) { // Compare start of days
        return { valid: false, error: '开始日期不能早于今天。' };
    }
    if (isBefore(endDate, startDate)) {
        return { valid: false, error: '结束日期不能早于开始日期。' };
    }
    // The difference in days for a 7-day range (e.g., Mon to Sun) is 6.
    // So, if difference is >= maxDays, it means it's *more than* maxDays long
    // e.g. if maxDays = 7, a difference of 6 is valid (7 distinct days). A difference of 7 is 8 days.
    if (differenceInDays(endDate, startDate) >= maxDays) {
        return { valid: false, error: `日期范围不能超过 ${maxDays} 天。` };
    }
    return { valid: true };
};

// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
// Export addDays directly if no conflict
export { addDays, startOfDay, parseISO, differenceInCalendarWeeks, startOfWeek };