// src/types/index.ts

// --- Core User Types ---
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
    userId: number;
    username: string;
    role: UserRole;
    email?: string;
    phone?: string;
    studentId?: string;
    teacherId?: string;
}

export interface UserDetail extends User {
    class_name?: string;
    enrollment_year?: number;
    department?: string;
    title?: string;
}

export interface UserPayload extends Omit<UserDetail, 'userId' | 'studentId' | 'teacherId'> {
    password?: string;
}


// --- Course, Classroom, Section, Schedule, Semester ---
// src/types/index.ts

export interface Course {
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    semester: 'spring' | 'fall';
    year: number;
    prerequisites?: string; // JSON string from DB
    maxCapacity: number; // Changed to non-optional as per Zod default in form
}
export interface Classroom {
    classroomId: number;
    building: string;
    roomNumber: string;
    capacity: number;
    equipment: 'basic' | 'multimedia' | 'lab';
}

export interface ClassSection {
    sectionId: number;
    startTime: string;
    endTime: string;
    periodType: 'morning' | 'afternoon' | 'evening';
    campus?: string;
}

export interface Schedule {
    scheduleId: number;
    courseId: number;
    teacherId: string;
    classroomId: number;
    sectionId: number;
    weekDay: number;
    weeks: string;
    courseName?: string;
    courseCode?: string;
    teacherName?: string;
    classroomBuilding?: string;
    classroomRoomNumber?: string;
    startTime?: string;
    endTime?: string;
    credit?: number;
    maxCapacity?: number;
    enrolledCount?: number;
}

export interface SemesterInfo {
    semesterId: number;
    semesterName: string;
    startDate: string;
    endDate: string;
    termType: 'spring' | 'fall';
    academicYear: string;
    isCurrent: boolean;
}

export interface TeacherInfo {
    teacherId: string;
    name: string;
    department?: string;
}


// --- Timetable Feature Types ---
export interface TimetableState {
    currentSemester: SemesterInfo | null;
    currentWeek: number | null;
    totalSemesterWeeks: number | null; // <-- 确保这个字段也存在
    scheduleData: Schedule[];
    allSections: ClassSection[];
    isLoadingInitialData: boolean; // <-- 确保这个字段也存在
    isLoadingSemester: boolean; // <-- 确保这个字段也存在
    isLoadingSections: boolean; // <-- 确保这个字段也存在
    isLoadingSchedule: boolean; // <-- 确保这个字段也存在
    error: string | null;
    hasLoadedAllSections: boolean; // 新增：是否已成功加载所有节次
}

// --- Notification Feature Types ---
export interface Notification {
    notificationId: number;
    userId: number;
    title: string;
    content: string;
    notifyTime: string;
    type: 'schedule_change' | 'exam' | 'assignment' | 'system';
    isRead: boolean;
    link?: string;
    relatedId?: number;
}
export interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    filter: 'all' | 'unread';
}

// --- SharedData Types ---
export interface SharedDataState {
    allCoursesShort: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    allTeachers: TeacherInfo[];
    allClassroomsShort: Pick<Classroom, 'classroomId' | 'building' | 'roomNumber' | 'capacity'>[];
    isLoading: { courses: boolean; teachers: boolean; classrooms: boolean; };
    error: string | null;
    hasLoadedCoursesShort: boolean; // 新增：是否已成功加载课程简要列表
    hasLoadedTeachers: boolean; // 新增：是否已成功加载教师简要列表
    hasLoadedClassroomsShort: boolean; // 新增：是否已成功加载教室简要列表
}

// --- Empty Classroom Search Types ---
export interface EmptyClassroomQuery {
    startDate: string; endDate: string; sectionIds: number[];
    building?: string; minCapacity?: number;
}
export interface AvailableClassroom extends Classroom { }
export interface ClassroomState {
    query: Partial<EmptyClassroomQuery>; availableClassrooms: AvailableClassroom[];
    buildings: string[]; isLoading: boolean; error: string | null;
    hasLoadedBuildings: boolean; // 新增：是否已成功加载教学楼列表
}

// --- Student Course Selection Types ---
export interface SelectableCourse extends Schedule { }
export interface EnrollmentRecord {
    enrollmentId: number; studentId: string; scheduleId: number;
    enrollmentTime: string; status: 'enrolled' | 'withdrawn';
    scheduleInfo?: Schedule; courseInfo?: Pick<Course, 'courseCode' | 'courseName' | 'credit'>;
}
export interface CourseSelectionState {
    selectableCourses: SelectableCourse[]; myEnrollments: EnrollmentRecord[];
    isLoading: boolean; isEnrolling: Set<number>; error: string | null;
    currentSemesterId: number | null;
    hasLoadedSelectableCourses: boolean; // 新增
    hasLoadedEnrollments: boolean;       // 新增
}

// --- Exam Types ---
export interface ExamArrangement {
    examId: number; courseId: number; courseName: string; courseCode: string;
    examType: 'midterm' | 'final' | 'makeup'; examDate: string; sectionId: number;
    startTime: string; endTime: string; duration: number; classroomId: number;
    building: string; roomNumber: string;
    invigilators?: { teacherId: string; name: string; role: 'main' | 'assistant' }[];
}
export interface ExamState {
    myExams: ExamArrangement[]; isLoading: boolean; error: string | null;
    currentSemesterId: number | null;
    hasLoadedMyExams: boolean; // New
}

// --- Teacher Request Types ---
export type RequestType = 'schedule_change' | 'exam_arrangement';
export interface ScheduleChangeRequestPayload {
    originalScheduleId: number; proposedSectionId: number; proposedWeekDay: number;
    proposedWeeks: string; proposedClassroomId: number; reason: string;
}
export interface ExamRequestPayload {
    courseId: number; examType: 'midterm' | 'final' | 'makeup'; proposedDate: string;
    proposedSectionId: number; proposedClassroomId: number; proposedDuration: number;
    reason: string;
}
// src/types/index.ts

export interface TeacherRequest {
    requestId: number;
    requestType: RequestType;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string | null;
    approverInfo?: string | null;

    // Schedule Change Specific
    originalScheduleId?: number;
    originalScheduleInfo?: string; // 例如 "周一 第1-2节 @ 教学楼A 101 [1-16周]"
    // --- 新增或确认以下字段存在且为可选 ---
    originalWeekDay?: number;       // 原上课星期
    originalSectionId?: number;     // 原上课节次
    originalWeeks?: string;         // 原上课周次
    originalClassroomId?: number;   // 原教室ID
    originalClassroomInfo?: string; // 原教室描述 (例如 "教学楼A A101")
    // --- 结束新增字段 ---

    courseName?: string; // 课程名称，可以从 originalScheduleId 或 courseId 派生
    proposedSectionId?: number;
    proposedWeekDay?: number;
    proposedWeeks?: string;
    proposedClassroomId?: number;
    proposedClassroomInfo?: string; // 例如 "教学楼B 202"
    reason?: string;
    rejectReason?: string | null;

    // Exam Arrangement Specific
    courseId?: number;
    // courseName is shared
    examType?: 'midterm' | 'final' | 'makeup';
    proposedDate?: string; // YYYY-MM-DD
    // proposedSectionId is shared
    // proposedClassroomId is shared
    // proposedClassroomInfo is shared
    proposedDuration?: number; // in minutes
    examReason?: string; // 考试申请的特定原因，可能重用 'reason'

    // Fields for admin view of requests
    teacherId?: string;
    teacherName?: string;
}
export interface RequestState {
    teacherSchedules: Schedule[]; isLoadingSchedules: boolean;
    isSubmittingChange: boolean; isSubmittingExam: boolean; submitSuccess: boolean;
    myRequests: TeacherRequest[]; isLoadingMyRequests: boolean; error: string | null;
    currentSemesterIdForSchedules: number | null;
    hasLoadedTeacherSchedules: boolean; // 新增：是否已成功加载教师课表
    hasLoadedMyRequests: boolean; // 新增：是否已成功加载我的申请
}

// --- Teacher Assignment Types ---
export interface AssignmentPayload {
    title: string; content: string; courseId?: number;
}
export interface AssignmentState {
    isSubmitting: boolean; submitSuccess: boolean; error: string | null;
    teacherCourses: Pick<Course, 'courseId' | 'courseName' | 'courseCode'>[];
    isLoadingCourses: boolean; currentSemesterIdForCourses: number | null;
    hasLoadedTeacherCourses: boolean; // 新增：是否已成功加载教师授课列表
}

// --- Admin CRUD Base State ---
interface AdminCrudState<T> {
    items: T[]; isLoading: boolean; error: string | null;
    totalCount: number; page: number; pageSize: number;
}

// Admin Course Management
export interface AdminCourseState extends AdminCrudState<Course> {
    filterName?: string; // Example specific filter
}
// Updated CoursePayload: prerequisites is now a JSON string and optional
export interface CoursePayload {
    courseCode: string;
    courseName: string;
    credit: number;
    semester: 'spring' | 'fall';
    year: number;
    maxCapacity: number; // Non-optional due to form default
    prerequisites?: string; // JSON string, optional
}

// Admin Classroom Management
export interface AdminClassroomState extends AdminCrudState<Classroom> {
    filterBuilding?: string;
}
export interface ClassroomPayload extends Omit<Classroom, 'classroomId'> { }

// Admin Semester Management
export interface AdminSemesterState extends AdminCrudState<SemesterInfo> {
    isActivating: boolean;
}
export interface SemesterPayload extends Omit<SemesterInfo, 'semesterId' | 'isCurrent'> { }

// Admin User Management
export interface AdminUserState extends AdminCrudState<UserDetail> {
    filterRole: UserRole | 'all';
    filterUsername?: string;
}
// UserPayload already defined, ensure it handles password optionally

// Admin Schedule Management
export interface AdminScheduleState extends AdminCrudState<Schedule> {
    filterCourseId?: number | null; filterTeacherId?: string | null;
    filterClassroomId?: number | null; filterSemesterId?: number | null;
}
export interface SchedulePayload {
    courseId: number; teacherId: string; classroomId: number;
    sectionId: number; weekDay: number; weeks: string;
}

// Admin Request Approval
export interface AdminRequestState {
    pendingRequests: TeacherRequest[]; isLoading: boolean;
    isProcessing: Set<number>; error: string | null;
    filterType: 'all' | 'schedule_change' | 'exam_arrangement';
}