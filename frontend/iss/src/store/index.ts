// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';

// Core Feature Reducers
import authReducer from '../features/auth/store/authSlice';
import timetableReducer from '../features/timetable/store/timetableSlice';
import sharedDataReducer from './sharedDataSlice'; // Centralized shared data for dropdowns etc.

// Student Feature Reducers
import classroomReducer from '../features/classrooms/store/classroomSlice'; // For empty classroom search by students/teachers
import courseSelectionReducer from '../features/courses/store/courseSelectionSlice'; // For student course selection
import examReducer from '../features/exams/store/examSlice'; // For student/teacher viewing exams

// Teacher Feature Reducers
import requestReducer from '../features/requests/store/requestSlice'; // For teacher requests (schedule change, exam arrangement)
import assignmentReducer from '../features/assignments/store/assignmentSlice'; // For teacher assignments

// Shared Feature Reducers (used by multiple roles)
import notificationReducer from '../features/notifications/store/notificationSlice';

// Admin Feature Reducers
import adminCourseReducer from '../features/admin/courses/store/adminCourseSlice';
import adminClassroomReducer from '../features/admin/classrooms/store/adminClassroomSlice';
import adminSemesterReducer from '../features/admin/semesters/store/adminSemesterSlice';
import adminUserReducer from '../features/admin/users/store/adminUserSlice';
import adminScheduleReducer from '../features/admin/schedules/store/adminScheduleSlice';
import adminRequestReducer from '../features/admin/requests/store/adminRequestSlice'; // For admin request approval

export const store = configureStore({
    reducer: {
        // Core
        auth: authReducer,
        timetable: timetableReducer,
        sharedData: sharedDataReducer,

        // Student/Teacher shared or specific
        classrooms: classroomReducer,
        courses: courseSelectionReducer, // Uses Set for isEnrolling
        exams: examReducer,
        notifications: notificationReducer,
        requests: requestReducer,     // Teacher's own requests (might not use Set)
        assignments: assignmentReducer,

        // Admin
        adminCourses: adminCourseReducer,
        adminClassrooms: adminClassroomReducer,
        adminSemesters: adminSemesterReducer,
        adminUsers: adminUserReducer,
        adminSchedules: adminScheduleReducer,
        adminRequests: adminRequestReducer, // Uses Set for isProcessing
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Paths in the state to ignore for serialization checks
                // This is important if these paths store non-serializable values like Set, Map, Date objects directly
                ignoredPaths: [
                    'courses.isEnrolling',          // Student course selection uses a Set to track processing schedule IDs
                    'adminRequests.isProcessing',   // Admin request approval uses a Set to track processing request IDs
                    // Add any other paths here if they intentionally store non-serializable data.
                    // For example, if a date object from a DatePicker is stored directly in Redux state
                    // without being converted to a string first, that path might need to be ignored.
                    // 'someSlice.somePathContainingDateObject'
                ],
                // You can also ignore specific action types if their payload or meta is non-serializable,
                // but for state containing Set/Map, `ignoredPaths` is usually the primary configuration.
                // ignoredActions: [
                //    'courses/enrollStudentInCourse/pending',
                //    'courses/withdrawStudentFromCourse/pending',
                //    'adminRequests/approveAdminRequestAction/pending',
                //    'adminRequests/rejectAdminRequestAction/pending',
                // ],
            },
        }),
    // Enable Redux DevTools in development, disable in production for performance/security
    devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;