#ifndef REQUEST_PARSER_H
#define REQUEST_PARSER_H

#include <QHttpServerRequest>
#include <QJsonObject>
#include <QUrlQuery>
#include <QVariant> // 用于可选参数
#include <QHttpHeaders>
namespace RequestParser {

// 解析JSON请求体 (这个之前已经比较完善了)
bool parseJsonBody(const QHttpServerRequest &request, QJsonObject &bodyJson, QString &errorMessage);

// --- 列表查询参数 ---
struct ListQueryParams {
    // 分页
    int page = 0; // 默认值
    int pageSize = 10; // 默认值
    bool pagePresent = false;
    bool pageSizePresent = false;

    // 排序
    QString sortField;
    QString sortOrder = "asc"; // 默认升序
    bool sortPresent = false;

    // 通用过滤器 (用于存储解析后的扁平化或嵌套的过滤器值)
    QVariantMap filters; // 使用 QVariantMap 存储各种可能的过滤器

    ListQueryParams(const QUrlQuery& query); // 构造函数直接从 QUrlQuery 初始化
};

// --- 专用的参数解析结构体 ---

// 对应前端 fetchAdminCourses Thunk
struct AdminCoursesFilterParams : public ListQueryParams {
    QString courseName_like;
    QString courseCode_like;
    // 其他特定于课程的过滤器可以加在这里

    AdminCoursesFilterParams(const QUrlQuery& query);
};

// 对应前端 fetchAdminClassrooms Thunk
struct AdminClassroomsFilterParams : public ListQueryParams {
    QString building_like;
    QString equipment_eq; // 'basic', 'multimedia', 'lab', or "" (不过滤)

    AdminClassroomsFilterParams(const QUrlQuery& query);
};

// 对应前端 fetchAdminUsers Thunk
struct AdminUsersFilterParams : public ListQueryParams {
    QString filterRole;
    QString filterUsername_like; // 对应前端的 filterUsername

    AdminUsersFilterParams(const QUrlQuery& query);
};

// 对应前端 fetchAdminSchedules Thunk
struct AdminSchedulesFilterParams : public ListQueryParams {
    QVariant filterCourseId;     // int
    QVariant filterTeacherId;    // QString
    QVariant filterClassroomId;  // int
    QVariant filterSemesterId;   // int (必需)

    AdminSchedulesFilterParams(const QUrlQuery& query);
};

// 对应前端 fetchPendingAdminRequests Thunk
struct AdminPendingRequestsParams {
    QString filterType; // 'all', 'schedule_change', 'exam_arrangement', 或空

    AdminPendingRequestsParams(const QUrlQuery& query);
};


// 对应前端 findAvailableClassrooms Thunk
struct EmptyClassroomQueryParams {
    QDate startDate;
    QDate endDate;
    QList<int> sectionIds;
    QString building;       // 可选
    QVariant minCapacity;   // int, 可选

    bool valid = true; // 解析是否成功
    QString parseError;

    EmptyClassroomQueryParams(const QUrlQuery& query);
};

// 对应前端 fetchScheduleForWeek (学生课表) / 教师课表
struct TimetableQueryParams {
    int semesterId = 0;
    int week = 0;
    bool valid = false;
    QString parseError;

    TimetableQueryParams(const QUrlQuery& query);
};


// 辅助函数
QVariant getQueryParamAsInt(const QUrlQuery& query, const QString& key, bool& present, bool& ok);
QString getQueryParamAsString(const QUrlQuery& query, const QString& key, bool& present);


} // namespace RequestParser

#endif // REQUEST_PARSER_H
