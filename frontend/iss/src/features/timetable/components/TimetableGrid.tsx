// src/features/timetable/components/TimetableGrid.tsx
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Schedule, ClassSection } from '../../../types';
import { isCourseInWeek } from '../../../utils/timetableUtils';
import CourseCell from './CourseCell';
import TimetableHeader from './TimetableHeader';
import TimetableSidebar from './TimetableSidebar';

interface TimetableGridProps {
    scheduleDataForWeek: Schedule[];
    allSections: ClassSection[];
    currentWeek: number;
}

interface ProcessedScheduleItem {
    schedule: Schedule;
    span: number;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({
    scheduleDataForWeek,
    allSections,
    currentWeek,
}) => {
    const processedScheduleMap = useMemo(() => {
        const scheduleMap: Record<string, ProcessedScheduleItem> = {};
        const processedScheduleIds = new Set<number>();

        const relevantSchedules = scheduleDataForWeek
            .filter(s => s.weeks && isCourseInWeek(s.weeks, currentWeek)) // Ensure s.weeks is defined
            .sort((a, b) => {
                if (a.weekDay !== b.weekDay) return a.weekDay - b.weekDay;
                return a.sectionId - b.sectionId;
            });

        for (const scheduleItem of relevantSchedules) {
            // Use a composite key if scheduleId is not unique per visual block (e.g. if a course has multiple distinct entries on same day/time)
            // For now, assuming scheduleId is sufficient to identify a block to span.
            // If a "course instance" (same course, teacher, usually same physical class) has multiple schedule entries
            // for consecutive sections, they share the same "scheduleId" in the original request's design.
            // If not, then a different grouping key (like courseId+teacherId+weekDay+firstSection) would be needed.
            if (processedScheduleIds.has(scheduleItem.scheduleId)) {
                continue;
            }

            let span = 1;
            // Mark the starting section as processed for this scheduleId
            // processedScheduleIds.add(scheduleItem.scheduleId); // This might be too broad if scheduleId is not unique enough.
            // Let's assume scheduleId refers to a specific class instance (e.g. CS101 by Prof X on Mon 1-2)

            // Correct span calculation: Iterate through all sections for this schedule instance.
            // Find all entries in relevantSchedules that match scheduleItem.scheduleId and scheduleItem.weekDay.
            const sectionsForThisCourseOnThisDay = relevantSchedules.filter(
                s => s.scheduleId === scheduleItem.scheduleId && s.weekDay === scheduleItem.weekDay
            ).sort((a, b) => a.sectionId - b.sectionId);

            if (sectionsForThisCourseOnThisDay.length > 0 && sectionsForThisCourseOnThisDay[0].sectionId === scheduleItem.sectionId) {
                span = 0;
                let expectedNextSection = scheduleItem.sectionId;
                for (const sectionEntry of sectionsForThisCourseOnThisDay) {
                    if (sectionEntry.sectionId === expectedNextSection && sectionEntry.weeks && isCourseInWeek(sectionEntry.weeks, currentWeek)) {
                        span++;
                        processedScheduleIds.add(sectionEntry.scheduleId); // Mark this part as processed.
                        // If scheduleId is truly for the "block", this works.
                        // If each section is a new scheduleId, this needs rethink.
                        expectedNextSection++;
                    } else {
                        // Break if not consecutive or not in current week
                        // This break is important if a course is e.g. 1st and 3rd section but not 2nd.
                        break;
                    }
                }
            }
            span = Math.max(1, span); // Ensure span is at least 1

            const key = `${scheduleItem.weekDay}-${scheduleItem.sectionId}`;
            scheduleMap[key] = { schedule: scheduleItem, span };
        }
        return scheduleMap;
    }, [scheduleDataForWeek, currentWeek]);

    if (allSections.length === 0) {
        return <Typography sx={{ p: 2, textAlign: 'center' }}>节次信息未加载。</Typography>;
    }

    const gridCellStyle = {
        borderRight: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        minHeight: '70px',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 0,
        backgroundColor: '#fff',
        position: 'relative' as 'relative',
    };

    return (
        <Box
            id="timetable-grid-export"
            sx={{
                display: 'grid',
                gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))', // Adjusted sidebar width
                gridTemplateRows: `40px repeat(${allSections.length}, minmax(70px, auto))`, // Adjusted header height
                border: '1px solid #ccc',
                overflow: 'auto',
                backgroundColor: '#f0f0f0', // Grid line color
            }}
        >
            <TimetableHeader />
            <TimetableSidebar sections={allSections} />

            {allSections.map((section: ClassSection, rowIndex: number) => (
                Array.from({ length: 7 }).map((_, dayIndex: number) => {
                    const dayOfWeek = dayIndex + 1;
                    const currentSectionId = section.sectionId;
                    const cellKey = `${dayOfWeek}-${currentSectionId}`;
                    const processedItem = processedScheduleMap[cellKey];

                    let isSpannedOver = false;
                    if (!processedItem) {
                        for (let prevRowIndex = 0; prevRowIndex < rowIndex; prevRowIndex++) {
                            const prevSectionId = allSections[prevRowIndex].sectionId;
                            const prevKey = `${dayOfWeek}-${prevSectionId}`;
                            const potentialSpanner = processedScheduleMap[prevKey];
                            if (potentialSpanner && (potentialSpanner.schedule.sectionId + potentialSpanner.span) > currentSectionId) {
                                isSpannedOver = true;
                                break;
                            }
                        }
                    }

                    if (isSpannedOver) {
                        return null;
                    }

                    return (
                        <Box
                            key={`${dayOfWeek}-${currentSectionId}-cell`}
                            sx={{
                                ...gridCellStyle,
                                gridColumnStart: dayIndex + 2, // CSS grid lines are 1-based
                                gridRowStart: rowIndex + 2,
                                ...(processedItem && processedItem.span > 1 && {
                                    gridRowEnd: `span ${processedItem.span}`,
                                }),
                            }}
                        >
                            {processedItem && (
                                <CourseCell scheduleItem={processedItem.schedule} />
                            )}
                        </Box>
                    );
                })
            ))}
        </Box>
    );
};

export default TimetableGrid;