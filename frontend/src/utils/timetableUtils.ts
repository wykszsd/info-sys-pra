// src/utils/timetableUtils.ts

export const isCourseInWeek = (scheduleWeeks: string | null | undefined, targetWeek: number): boolean => {
    if (!scheduleWeeks || typeof scheduleWeeks !== 'string' || targetWeek < 1) {
        return false;
    }
    try {
        const parts = scheduleWeeks.split(',');
        for (const part of parts) {
            const trimmedPart = part.trim();
            if (trimmedPart.includes('-')) {
                const [startStr, endStr] = trimmedPart.split('-');
                const start = parseInt(startStr, 10);
                const end = parseInt(endStr, 10);
                if (!isNaN(start) && !isNaN(end) && targetWeek >= start && targetWeek <= end) {
                    return true;
                }
            } else {
                const week = parseInt(trimmedPart, 10);
                if (!isNaN(week) && targetWeek === week) {
                    return true;
                }
            }
        }
    } catch (error) {
        console.error("Error parsing schedule weeks:", scheduleWeeks, error);
        return false;
    }
    return false;
};

export const formatTimeString = (timeString: string | null | undefined): string => {
    if (!timeString) return '';
    try {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
    } catch (e) {
        // ignore, return original
    }
    return timeString;
};

// Helper to parse "1-8,10" into [true,true,...,true,false,true,...] for WeekPicker
export const parseWeeksStringToBoolArray = (str: string | undefined, total: number): boolean[] => {
    const selected = new Array(total).fill(false);
    if (!str) return selected;
    try {
        str.split(',').forEach(part => {
            const trimmedPart = part.trim();
            if (trimmedPart.includes('-')) {
                const [startStr, endStr] = trimmedPart.split('-');
                const start = parseInt(startStr, 10);
                const end = parseInt(endStr, 10);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
                        if (i - 1 < selected.length) selected[i - 1] = true;
                    }
                }
            } else {
                const week = parseInt(trimmedPart, 10);
                if (!isNaN(week) && week >= 1 && week <= total) {
                    if (week - 1 < selected.length) selected[week - 1] = true;
                }
            }
        });
    } catch (e) { console.error("Error parsing weeks string for boolean array:", e); }
    return selected;
};

// Helper to convert boolean array to "1-8,10" string for WeekPicker
export const formatBoolArrayToWeeksString = (selected: boolean[]): string => {
    const ranges: string[] = [];
    let start = -1;
    selected.forEach((isSelected, index) => {
        const weekNum = index + 1;
        if (isSelected) {
            if (start === -1) start = weekNum;
        } else {
            if (start !== -1) {
                ranges.push(start === weekNum - 1 ? `${start}` : `${start}-${weekNum - 1}`);
                start = -1;
            }
        }
    });
    if (start !== -1) { // Handle trailing selection
        ranges.push(start === selected.length ? `${start}` : `${start}-${selected.length}`);
    }
    return ranges.join(',');
};