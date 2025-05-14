import axiosInstance from '../../../../services/axiosInstance'; // Adjust path
import type { Classroom, ClassroomPayload } from '../../../../types'; // Adjust path
// Adjust path
import MOCK_ADMIN_CLASSROOMS from './mockData/adminClassrooms.json'; // Adjust path

let mockClassroomsDb: Classroom[] = JSON.parse(JSON.stringify(MOCK_ADMIN_CLASSROOMS));
let nextClassroomIdDb = Math.max(...mockClassroomsDb.map(c => c.classroomId), 0) + 1;

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

interface GetClassroomsParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    // filter 及其内部属性都是可选的
    filter?: { building_like?: string; equipment_eq?: Classroom['equipment'] | '' };
}
interface ApiListResponse<T> {
    data: T[];
    totalCount: number;
}

const getClassrooms = async (params: GetClassroomsParams): Promise<ApiListResponse<Classroom>> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminClassroomApi.getClassrooms with params:", params);
        await new Promise(res => setTimeout(res, 200 + Math.random() * 200));
        let filteredItems = [...mockClassroomsDb];

        // 首先检查 params.filter 是否存在
        if (params.filter) {
            // 在确认 params.filter 存在后，再安全地访问其属性
            const filter = params.filter; // 可以将类型收窄后的 filter 赋值给一个新变量，更清晰

            if (filter.building_like) { // 检查可选属性 building_like 是否有值
                const buildingFilter = filter.building_like.toLowerCase();
                filteredItems = filteredItems.filter(item => item.building.toLowerCase().includes(buildingFilter));
            }
            // 检查 equipment_eq 是否具有特定值（不是 undefined、null 或代表“全部类型”的空字符串）
            if (filter.equipment_eq !== undefined && filter.equipment_eq !== null && filter.equipment_eq !== '') {
                // 仅当 equipment_eq 是特定的设备类型（'basic', 'multimedia', 'lab'）时才进行过滤。
                // equipment_eq 为空字符串表示“全部设备类型”，此处不应进行过滤。
                filteredItems = filteredItems.filter(item => item.equipment === filter.equipment_eq);
            }
        }
        // Add sorting mock if needed (e.g., by building, then roomNumber)
        if (params.sort === 'building,asc') filteredItems.sort((a, b) => a.building.localeCompare(b.building) || a.roomNumber.localeCompare(b.roomNumber));
        if (params.sort === 'building,desc') filteredItems.sort((a, b) => b.building.localeCompare(a.building) || b.roomNumber.localeCompare(a.roomNumber));


        const totalCount = filteredItems.length;
        const page = params.page ?? 0;
        const pageSize = params.pageSize ?? 10;
        const paginatedData = filteredItems.slice(page * pageSize, (page + 1) * pageSize);
        return { data: paginatedData, totalCount };
    } else {
        // TODO (Backend): GET /api/classrooms
        // Params: page, pageSize, sort, filter_building_like, filter_equipment_eq
        const response = await axiosInstance.get<ApiListResponse<Classroom>>('admin/classrooms', { params });
        return response.data;
    }
};

const createClassroom = async (payload: ClassroomPayload): Promise<Classroom> => {
    if (USE_MOCK_API) {
        console.log("MOCK API: adminClassroomApi.createClassroom with payload:", payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 100));
        if (mockClassroomsDb.some(c => c.building === payload.building && c.roomNumber === payload.roomNumber)) {
            throw { response: { data: { message: `教室 ${payload.building} ${payload.roomNumber} 已存在 (模拟)` } } };
        }
        const newClassroom: Classroom = { ...payload, classroomId: nextClassroomIdDb++ };
        mockClassroomsDb.push(newClassroom);
        return newClassroom;
    } else {
        // TODO (Backend): POST /api/classrooms
        const response = await axiosInstance.post<Classroom>('admin/classrooms', payload);
        return response.data;
    }
};

const updateClassroom = async (id: number, payload: Partial<ClassroomPayload>): Promise<Classroom> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminClassroomApi.updateClassroom ${id} with payload:`, payload);
        await new Promise(res => setTimeout(res, 300 + Math.random() * 100));
        const index = mockClassroomsDb.findIndex(c => c.classroomId === id);
        if (index === -1) throw { response: { data: { message: "教室未找到 (模拟)" } } };
        // Check for duplicate building/roomNumber if these are being changed
        const currentClassroom = mockClassroomsDb[index];
        const checkBuilding = payload.building ?? currentClassroom.building; // Use new value if provided, else old
        const checkRoomNumber = payload.roomNumber ?? currentClassroom.roomNumber; // Use new value if provided, else old

        if ((payload.building !== undefined || payload.roomNumber !== undefined) && // Only check if building or roomNumber is actually changing
            (checkBuilding !== currentClassroom.building || checkRoomNumber !== currentClassroom.roomNumber) &&
            mockClassroomsDb.some(c => c.classroomId !== id && c.building === checkBuilding && c.roomNumber === checkRoomNumber)
        ) {
            throw { response: { data: { message: `更新后的教室 ${checkBuilding} ${checkRoomNumber} 已存在 (模拟)` } } };
        }
        mockClassroomsDb[index] = { ...currentClassroom, ...payload };
        return mockClassroomsDb[index];
    } else {
        // TODO (Backend): PUT /api/classrooms/{id}
        const response = await axiosInstance.put<Classroom>(`admin/classrooms/${id}`, payload);
        return response.data;
    }
};


const deleteClassroom = async (id: number): Promise<void> => {
    if (USE_MOCK_API) {
        console.log(`MOCK API: adminClassroomApi.deleteClassroom ${id}`);
        await new Promise(res => setTimeout(res, 400 + Math.random() * 50));
        const initialLength = mockClassroomsDb.length;
        mockClassroomsDb = mockClassroomsDb.filter(c => c.classroomId !== id);
        if (mockClassroomsDb.length === initialLength) throw { response: { data: { message: "教室未找到 (模拟)" } } };
        return;
    } else {
        // TODO (Backend): DELETE /api/classrooms/{id}
        // Backend should check if classroom is in use in schedules/exams before allowing delete
        await axiosInstance.delete(`admin/classrooms/${id}`);
    }
};

export const adminClassroomApi = {
    getClassrooms,
    createClassroom,
    updateClassroom,
    deleteClassroom,
};