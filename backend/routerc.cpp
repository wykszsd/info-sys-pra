#include "routerc.h"

#include "middleware/jwt_middleware.h" // 使用我们之前定义的极简JWT
#include "utils/request_parser.h"    // 使用我们之前定义的参数解析器
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray> // 为了能返回JsonArray类型的响应
#include <QDebug>
routerc::routerc(QObject *parent)
    : QObject{parent}
{}

void routerc::setsql(SqlServer *p)
{
    m_db=p;
}



// --- 辅助函数：用于创建标准化的HTTP响应 ---

// 发送成功的JSON对象响应
static QHttpServerResponse jsonResponse(const QJsonObject &data,
                                        QHttpServerResponse::StatusCode statusCode = QHttpServerResponse::StatusCode::Ok) {
    QJsonObject camelCaseData = RequestParser::convertJsonObjectKeys(data, RequestParser::snakeToCamel);
    QHttpServerResponse response(camelCaseData, statusCode);
    QHttpHeaders headers;
    headers.append("Access-Control-Allow-Origin", "http://localhost:5173");
    headers.append("Access-Control-Allow-Credentials", "true");
    response.setHeaders(headers);
    return response;
}

// 发送成功的JSON数组响应
static QHttpServerResponse jsonResponse(const QJsonArray &data,
                                        QHttpServerResponse::StatusCode statusCode = QHttpServerResponse::StatusCode::Ok) {
    QJsonArray camelCaseData = RequestParser::convertJsonArrayKeys(data, RequestParser::snakeToCamel);
    QHttpServerResponse response(camelCaseData, statusCode);
    QHttpHeaders headers;
    headers.append("Access-Control-Allow-Origin", "http://localhost:5173");
    headers.append("Access-Control-Allow-Credentials", "true");
    response.setHeaders(headers);
    return response;
}

// 发送错误响应
static QHttpServerResponse errorResponse(const QString &message,
                                         QHttpServerResponse::StatusCode statusCode) {
    QJsonObject errorObj;
    errorObj["message"] = message;
    qWarning() << "错误响应 (" << static_cast<int>(statusCode) << "):" << message;
    QHttpServerResponse response(errorObj, statusCode);
    QHttpHeaders headers;
    headers.append("Access-Control-Allow-Origin", "http://localhost:5173");
    headers.append("Access-Control-Allow-Credentials", "true");
    response.setHeaders(headers);
    return response;

}

// 发送成功的无内容响应 (例如，用于登出或某些DELETE操作)
static QHttpServerResponse noContentResponse() {
    QHttpServerResponse response(QHttpServerResponse::StatusCode::NoContent);
    QHttpHeaders headers;
    headers.append("Access-Control-Allow-Origin", "http://localhost:5173");
    headers.append("Access-Control-Allow-Credentials", "true");
    response.setHeaders(headers);
    return response;

}

// --- setupRoutes 方法的开始 ---
void routerc::setupRoutes(QHttpServer &server) {
    qInfo() << "开始配置API路由...";
    server.setMissingHandler(this,[](const QHttpServerRequest &request,QHttpServerResponder & responder){
        if(request.method()== QHttpServerRequest::Method::Options){

            qDebug() << "收到预检 OPTIONS 请求 (全局):" << request.url().path();
            QHttpServerResponse response(QHttpServerResponse::StatusCode::NoContent); // 204 No Content 通常用于 OPTIONS
            QHttpHeaders headers;

            headers.append("Access-Control-Allow-Origin", "http://localhost:5173");
            headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            headers.append("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With"); // 包含你前端可能发送的所有头部
            headers.append("Access-Control-Max-Age", "86400"); // 预检请求结果的缓存时间 (秒)，例如1天
            headers.append("Access-Control-Allow-Credentials", "true");
            response.setHeaders(headers);
            responder.sendResponse(response);
        }
    }
                             );
    server.route("/",QHttpServerRequest::Method::AnyKnown,[]()->QHttpServerResponse{
        QFile file(":/dist/index.html");
        file.open(QIODevice::ReadOnly);

return QHttpServerResponse(file.readAll());

});
    server.route("/assets/<arg>",QHttpServerRequest::Method::AnyKnown,[](const QString rec)->QHttpServerResponse{

        QFile file(":/assets/"+rec);
        file.open(QIODevice::ReadOnly);
        QHttpServerResponse re(file.readAll());
        QHttpHeaders headers;
        if(rec.endsWith("js"))
        headers.append("Content-Type","application/javascript");
        re.setHeaders(headers);

        return re;
}
);

    // 一、认证 (Auth) - API清单部分
    // =============================================

    // 1. 用户登录 (POST /api/auth/login)
    server.route("/api/auth/login", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/auth/login";
                     QJsonObject bodyJson;
                     QString parseErrorMsg;

                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QString username = bodyJson.value("username").toString();
                     // 前端在 loginUser Thunk 中传递的是 password_hash，但这里应该是明文 password
                     // 我们假设前端已更正为传递 "password"
                     QString password = bodyJson.value("password").toString();

                     if (password.isEmpty() && bodyJson.contains("password_hash")) { // 兼容旧的前端错误
                         password = bodyJson.value("password_hash").toString();
                         qWarning() << "/api/auth/login: 前端可能错误地传递了 'password_hash' 而不是 'password'. 已尝试兼容。";
                     }


                     if (username.isEmpty() || password.isEmpty()) {
                         return errorResponse("用户名和密码不能为空。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QJsonObject userInfoFromDb; // 用于接收数据库返回的用户基本信息
                     QString loginResultMessage;

                     bool loginSuccess = m_db->Logining(username, password, userInfoFromDb, loginResultMessage);

                     if (loginSuccess && loginResultMessage == "success") {
                         int userId = userInfoFromDb.value("user_id").toInt();
                         QString dbUsername = userInfoFromDb.value("username").toString(); // 从数据库获取确切的用户名
                         QString role = userInfoFromDb.value("role").toString();

                         // 生成JWT Token (使用我们的极简版)
                         QString token = JwtMiddleware::generateToken(userId, dbUsername, role);

                         QJsonObject responseData;
                         responseData["token"] = token;
                         // 构建API清单中要求的user对象
                         QJsonObject userObjectForResponse;
                         userObjectForResponse["userId"] = userId;
                         userObjectForResponse["username"] = dbUsername;
                         userObjectForResponse["role"] = role;
                         responseData["user"] = userObjectForResponse;

                         qInfo() << "用户" << dbUsername << "登录成功。";
                         return jsonResponse(responseData);
                     } else {
                         qWarning() << "用户" << username << "登录失败:" << loginResultMessage;
                         // 根据 loginResultMessage 可以返回更具体的错误，但API清单只要求"用户名或密码错误"
                         return errorResponse("用户名或密码错误。", QHttpServerResponse::StatusCode::Unauthorized);
                     }
                 });

    // 2. 获取当前用户信息 (GET /api/auth/me)
    server.route("/api/auth/me", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/auth/me";
                     QJsonObject userPayloadFromToken; // 用于接收从token中解码出的用户信息

                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("无效的Token或用户不存在。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     int userId = userPayloadFromToken.value("userId").toInt();
                     QJsonObject userProfile = m_db->getUserProfile(userId);

                     if (userProfile.isEmpty()) {
                         // 这种情况理论上不应该发生，因为 verifyToken 成功意味着用户存在
                         // 但以防万一数据库层面发生问题
                         qWarning() << "GET /api/auth/me: Token有效但未能从数据库获取用户 " << userId << " 的档案。";
                         return errorResponse("无法获取用户信息。", QHttpServerResponse::StatusCode::NotFound);
                     }
                     // SqlServer::getUserProfile 已经处理了根据角色JOIN不同表
                     // 确保不泄露敏感信息，如 password_hash (虽然 getUserProfile 内部可能已经排除了)
                     userProfile.remove("password_hash");

                     qInfo() << "成功获取用户 " << userId << " 的档案信息。";
                     return jsonResponse(userProfile);
                 });

    // 3. 用户登出 (POST /api/auth/logout)
    server.route("/api/auth/logout", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/auth/logout";
                     QByteArray authHeader = request.headers().value("Authorization").toByteArray();
                     QString tokenToBlacklist;

                     if (authHeader.startsWith("Bearer ")) {
                         tokenToBlacklist = QString::fromUtf8(authHeader.mid(7));
                     } else {
                         // 理论上，能到这里的请求应该已经通过了某种形式的认证检查（如果登出也需要认证）
                         // 或者，登出操作不需要严格的token验证，只要能拿到token字符串就行
                         qWarning() << "/api/auth/logout: 请求缺少有效的 'Bearer ' token。";
                         return errorResponse("无效的Token或用户不存在。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     // 对于我们的极简 token，黑名单是基于整个 token 字符串
                     // 对于标准的JWT，这里应该是从 token 中解析出 'jti' claim
                     // SqlServer 类中的 addTokenToBlacklist 是为标准JWT的jti设计的
                     // 我们需要一个适配或者修改 SqlServer
                     // 为了演示，我们假设 SqlServer 有一个方法可以处理简单字符串token的黑名单
                     // 或者我们在这里直接忽略黑名单，因为极简token的黑名单意义不大。
                     // 暂时，我们只返回成功，表示客户端应该清除本地token。

                     // 实际生产中，你会这样做：
                     /*
        QJsonObject userPayloadFromToken;
        if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) { // 可选：验证token仍然是“有效”格式
            return errorResponse("无效的Token。", QHttpServerResponse::StatusCode::Unauthorized);
        }
        QString jti = userPayloadFromToken.value("jti").toString(); // 假设极简token里有jti
        quint64 userId = userPayloadFromToken.value("userId").toInteger();
        QDateTime expiryTime = QDateTime::fromSecsSinceEpoch(userPayloadFromToken.value("exp").toInteger());
        QString blacklistMsg;
        if (m_db->addTokenToBlacklist(jti, userId, expiryTime, blacklistMsg)) {
            qInfo() << "Token (JTI: " << jti << ") 已成功加入黑名单。";
            return noContentResponse();
        } else {
            qWarning() << "Token (JTI: " << jti << ") 加入黑名单失败: " << blacklistMsg;
            return errorResponse("登出时服务端发生错误。", QHttpServerResponse::StatusCode::InternalServerError);
        }
        */

                     // 对于当前极简token的简化处理：
                     qInfo() << "用户请求登出。Token (简化版): " << tokenToBlacklist << "。客户端应清除此token。";
                     // 如果要模拟黑名单:
                     // QString msg;
                     // m_db->addTokenToBlacklist(tokenToBlacklist, 0, QDateTime::currentDateTime().addDays(1), msg); // 假设有这么一个函数
                     return noContentResponse();
                 });

    qInfo() << "认证 (Auth) 路由配置完成。";

    // 后续部分将在这里添加...
    // setupPublicDataRoutes(server);
    // setupStudentRoutes(server);
    // ...etc.
    qInfo() << "开始配置公共数据和通用功能路由...";

    // =============================================
    // 二、公共数据与配置 (Shared Data & Config)
    // =============================================

    // 1. 获取当前激活学期信息 (GET /api/semesters/current)
    server.route("/api/semesters/current", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/semesters/current";
                     // 根据API清单，此接口认证可选，这里我们暂时不加JWT验证，
                     // 如果需要，可以在这里调用 JwtMiddleware::verifyToken
                     Q_UNUSED(request); // 当前未使用request对象

                     QJsonObject currentSemester = m_db->getCurrentSemesterInfo();
                     if (currentSemester.isEmpty()) {
                         return errorResponse("未找到当前激活的学期。", QHttpServerResponse::StatusCode::NotFound);
                     }
                     qInfo() << "成功获取当前学期信息。";
                     return jsonResponse(currentSemester);
                 });

    // 2. 获取所有节次列表 (GET /api/class-sections)
    server.route("/api/class-sections", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/class-sections";
                     // API清单指明此接口需要认证
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权访问节次列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     QJsonArray sections = m_db->getAllClassSections();
                     qInfo() << "成功获取所有节次列表，数量：" << sections.count();
                     return jsonResponse(sections);
                 });

    // 3. 获取课程简要列表 (GET /api/courses/list-short)
    server.route("/api/courses/list-short", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/courses/list-short";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权访问课程简要列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     // API清单显示此接口可以有可选的 semesterId 参数，
                     // 但 SqlServer::getCoursesListShort(int semester_id = 0) 支持默认值。
                     // 前端 sharedDataSlice.ts 中的 fetchAllCoursesShortList 没有传递参数，
                     // 因此这里我们直接调用不带参数的版本，获取所有课程。
                     // 如果需要根据学期筛选，前端需要传递 semesterId。
                     RequestParser::ListQueryParams queryParams(request.query()); // 使用通用解析器获取参数
                     int semesterId = 0; // 默认获取所有
                     if(queryParams.filters.contains("semesterId")){ // 假设前端可能这样传 filter[semesterId]
                         bool ok;
                         semesterId = queryParams.filters.value("semesterId").toInt(&ok);
                         if(!ok) semesterId = 0;
                     } else { // 或者前端直接传 semesterId
                         bool present, ok;
                         QVariant semIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", present, ok);
                         if(present && ok && semIdVar.isValid()) {
                             semesterId = semIdVar.toInt();
                         }
                     }


                     QJsonArray courses = m_db->getCoursesListShort(semesterId);
                     qInfo() << "成功获取课程简要列表 (semesterId: " << semesterId << ")，数量：" << courses.count();
                     return jsonResponse(courses);
                 });

    // 4. 获取教师简要列表 (GET /api/teachers/list)
    server.route("/api/teachers/list", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/teachers/list";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权访问教师简要列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     QJsonArray teachers = m_db->getTeachersListShort();
                     qInfo() << "成功获取教师简要列表，数量：" << teachers.count();
                     return jsonResponse(teachers);
                 });

    // 5. 获取教室简要列表 (GET /api/classrooms/list-short)
    server.route("/api/classrooms/list-short", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/classrooms/list-short";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权访问教室简要列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     QJsonArray classrooms = m_db->getClassroomsListShort();
                     qInfo() << "成功获取教室简要列表，数量：" << classrooms.count();
                     return jsonResponse(classrooms);
                 });

    // 6. 获取所有教学楼名称列表 (GET /api/classrooms/distinct-buildings)
    server.route("/api/classrooms/distinct-buildings", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/classrooms/distinct-buildings";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权访问教学楼名称列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     QStringList buildingNames = m_db->getDistinctBuildingNames();
                     QJsonArray responseArray;
                     for(const QString& name : buildingNames) {
                         responseArray.append(name);
                     }
                     qInfo() << "成功获取教学楼名称列表，数量：" << responseArray.count();
                     return jsonResponse(responseArray);
                 });

    qInfo() << "公共数据与配置 (Shared Data & Config) 路由配置完成。";

    // =============================================
    // 三、学生与教师通用功能
    // =============================================

    // server.cpp (or wherever your routes are defined)
    server.route("/api/classrooms/empty", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse { // 确保 m_db 在捕获列表或可访问
                     qDebug() << "收到请求: GET /api/classrooms/empty";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权查询空教室。", QHttpServerResponse::StatusCode::Unauthorized);
                     }
                     RequestParser::EmptyClassroomQueryParams params(request.query()); // 假设参数解析类
                     if (!params.valid) {
                         return errorResponse("查询参数无效: " + params.parseError, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // m_db->getEmptyClassroom 返回的是每日空教室的数组的数组。
                     // 内部 QJsonObject 使用数据库列名，例如 "classroom_id", "capacity"。
                     // "capacity" 应该已经是 JSON number 类型（来自 SqlServer::getEmptyClassroom）。
                     QJsonArray availableClassroomsPerDay = m_db->getEmptyClassroom(
                         params.startDate,
                         params.endDate,
                         params.building,
                         "",                 // room_type (equipment) - 暂无此筛选参数从前端
                         params.sectionIds,
                         params.minCapacity.isValid() ? params.minCapacity.toInt() : -1
                         );

                     // --- 扁平化并去重 ---
                     QJsonArray finalFlattenedUniqueClassrooms;
                     // 使用 QSet 存储数据库中的 classroom_id (假设为整数) 来确保唯一性
                     QSet<int> processedDbClassroomIds;

                     for (const QJsonValue &dailyResultValue : availableClassroomsPerDay) {
                         if (dailyResultValue.isArray()) {
                             QJsonArray classroomsForOneDay = dailyResultValue.toArray();
                             for (const QJsonValue &classroomValue : classroomsForOneDay) {
                                 if (classroomValue.isObject()) {
                                     QJsonObject classroomObj = classroomValue.toObject();
                                     // 使用数据库的 "classroom_id" 键进行去重。
                                     // classroom_id 应该是数字类型。
                                     QJsonValue idValue = classroomObj.value("classroom_id");
                                     if (idValue.isDouble()) { // QJsonValue 存储数字为 double
                                         int dbClassroomId = idValue.toInt(); // 转换为 int
                                         if (!processedDbClassroomIds.contains(dbClassroomId)) {
                                             // 将原始的 classroomObj (包含数据库键名) 添加到结果列表。
                                             // jsonResponse 后续会处理键名转换。
                                             finalFlattenedUniqueClassrooms.append(classroomObj);
                                             processedDbClassroomIds.insert(dbClassroomId);
                                         }
                                     } else {
                                         qWarning() << "Classroom object found without a valid numeric 'classroom_id': " << classroomObj;
                                         // 可以选择是否跳过此条目或如何处理
                                     }
                                 }
                             }
                         }
                     }
                     // --- 扁平化并去重结束 ---

                     qInfo() << "空教室查询成功 (待规范化): " << params.startDate.toString() << "至" << params.endDate.toString()
                             << ", 节次: " << params.sectionIds << ", 楼宇: " << params.building
                             << ", 最小容量: " << (params.minCapacity.isValid() ? params.minCapacity.toInt() : -1)
                             << "。找到 " << finalFlattenedUniqueClassrooms.count() << " 个唯一的空教室对象。";

                     // 将包含数据库键名的扁平化、去重后的数组传递给 jsonResponse。
                     // jsonResponse 负责将 "classroom_id" 转为 "classroomId", "room_number" 转为 "roomNumber",
                     // 并确保 "capacity" 仍然是数字等。
                     return jsonResponse(finalFlattenedUniqueClassrooms);
                 });

    // 2. 获取我的课表 (周视图) (GET /api/timetable/my)
    server.route("/api/timetable/my", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/timetable/my";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取课表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     RequestParser::TimetableQueryParams params(request.query());
                     if (!params.valid) {
                         return errorResponse("查询参数无效: " + params.parseError, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     int userId = userPayloadFromToken.value("userId").toInt();
                     QString role = userPayloadFromToken.value("role").toString();
                     QJsonArray timetableData;

                     if (role == "student") {
                         timetableData = m_db->getUserClassTable(userId, params.semesterId, params.week);
                         qInfo() << "学生 " << userId << " 获取课表成功 (学期ID: " << params.semesterId << ", 周: " << params.week << ")，数量：" << timetableData.count();
                     } else if (role == "teacher") {
                         // 教师的 "my timetable" 是其教学安排
                         // 需要从 userId 获取 teacher_db_id (工号)
                         QJsonObject teacherProfile = m_db->getUserProfile(userId);
                         QString teacherDbId = teacherProfile.value("teacher_id").toString(); // teachers.teacher_id

                         if (teacherDbId.isEmpty()) {
                             qWarning() << "GET /api/timetable/my: 教师 (User ID: " << userId << ") 未找到对应的教师工号。";
                             return errorResponse("无法获取教师信息以查询课表。", QHttpServerResponse::StatusCode::InternalServerError);
                         }
                         // getTaughtSchedulesByTeacher 返回该学期该教师的所有排课
                         // 我们需要根据 'week' 参数进行筛选
                         QJsonArray allTaughtSchedules = m_db->getTaughtSchedulesByTeacher(teacherDbId, params.semesterId);
                         for (const QJsonValueConstRef val : allTaughtSchedules) {
                             QJsonObject schedule = val.toObject();
                             QString weeksMask = schedule.value("weeks").toString();
                             qDebug()<<schedule["weeks"];
                             if (params.week > 0 && params.week <= weeksMask.length() && weeksMask.at(params.week - 1) == '1') {
                                 schedule["weeks"]=RequestParser::binaryToRangeString(schedule["weeks"].toString());
                                 qDebug()<<schedule["weeks"];
                                 timetableData.append(schedule);
                             }
                         }
                         qInfo() << "教师 " << teacherDbId << " (User ID: " << userId << ") 获取教学安排成功 (学期ID: " << params.semesterId << ", 周: " << params.week << ")，数量：" << timetableData.count();
                     } else {
                         qWarning() << "GET /api/timetable/my: 用户 " << userId << " 角色 (" << role << ") 不支持此操作。";
                         return errorResponse("当前用户角色不支持获取此类型课表。", QHttpServerResponse::StatusCode::Forbidden);
                     }
                     return jsonResponse(timetableData);
                 });

    // 3. 获取我的考试安排 (GET /api/exams/my)
    server.route("/api/exams/my", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/exams/my";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取考试安排。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     bool semesterIdPresent, semesterIdOk;
                     QVariant semesterIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", semesterIdPresent, semesterIdOk);

                     if (!semesterIdPresent || !semesterIdOk || !semesterIdVar.isValid() || semesterIdVar.toInt() <=0) {
                         return errorResponse("必须提供有效的 'semesterId' 查询参数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = semesterIdVar.toInt();
                     int userId = userPayloadFromToken.value("userId").toInt();
                     QString role = userPayloadFromToken.value("role").toString();
                     QJsonArray examData;

                     if (role == "student") {
                         examData = m_db->getUserExamSchedule(userId, semesterId);
                         qInfo() << "学生 " << userId << " 获取考试安排成功 (学期ID: " << semesterId << ")，数量：" << examData.count();
                     } else if (role == "teacher") {
                         // 获取教师工号
                         QJsonObject teacherProfile = m_db->getUserProfile(userId);
                         QString teacherDbId = teacherProfile.value("teacher_id").toString();

                         if (teacherDbId.isEmpty()) {
                             qWarning() << "GET /api/exams/my: 教师 (User ID: " << userId << ") 未找到对应的教师工号。";
                             return errorResponse("无法获取教师信息以查询监考安排。", QHttpServerResponse::StatusCode::InternalServerError);
                         }
                         // 调用新实现的获取教师监考安排的方法
                         examData = m_db->getTeacherInvigilationSchedule(teacherDbId, semesterId);
                         qInfo() << "教师 " << teacherDbId << " (User ID: " << userId << ") 获取监考安排成功 (学期ID: " << semesterId << ")，数量：" << examData.count();
                     } else {
                         qWarning() << "GET /api/exams/my: 用户 " << userId << " 角色 (" << role << ") 不支持此操作。";
                         return errorResponse("当前用户角色不支持获取此类型考试安排。", QHttpServerResponse::StatusCode::Forbidden);
                     }
                     return jsonResponse(examData);
                 });

    // 4. 获取我的通知 (GET /api/notifications/my)
    server.route("/api/notifications/my", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/notifications/my";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取通知。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     int userId = userPayloadFromToken.value("userId").toInt();
                     // 前端 notificationApi.getMyNotifications 若 filter === 'unread'，则 params = { unread: true }
                     // 所以后端应该解析 'unread' 参数。但 API 清单中是 filter: string ('all' | 'unread')
                     // 我们遵循 API 清单的 'filter' 参数。 SqlServer::getUserNotifications 也是这样设计的。
                     bool filterPresent;
                     QString filter = RequestParser::getQueryParamAsString(request.query(), "filter", filterPresent).toLower();
                     if (!filterPresent || (filter != "all" && filter != "unread")) {
                         filter = "all"; // 默认获取所有
                     }

                     QJsonArray notifications = m_db->getUserNotifications(userId, filter);
                     qInfo() << "用户 " << userId << " 获取通知成功 (filter: " << filter << ")，数量：" << notifications.count();
                     return jsonResponse(notifications);
                 });

    // 5. 标记单条通知为已读 (POST /api/notifications/{notificationId}/read)
    server.route("/api/notifications/<arg>/read", QHttpServerRequest::Method::Post,
                 [&](int notificationId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     // <arg> 会被捕获到 notificationId
                     qDebug() << "收到请求: POST /api/notifications/" << notificationId << "/read";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权标记通知。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     int userId = userPayloadFromToken.value("userId").toInt();
                     QString message;
                     if (m_db->markNotificationAsRead(notificationId, userId, message)) {
                         qInfo() << "用户 " << userId << " 成功标记通知 " << notificationId << " 为已读。";
                         // API清单说 "成功 204 No Content 或 200 OK { "success": true }"
                         // return jsonResponse(QJsonObject{{"success", true}});
                         return noContentResponse();
                     } else {
                         // 根据 message 判断是 "not found" 还是 "already read" 等
                         // 如果是 "Notification was already read", 也可视为一种成功或无操作
                         // 这里简单返回一个错误
                         qWarning() << "用户 " << userId << " 标记通知 " << notificationId << " 为已读失败: " << message;
                         if(message.contains("not found") || message.contains("does not belong")) {
                             return errorResponse(message, QHttpServerResponse::StatusCode::NotFound);
                         }
                         return errorResponse(message, QHttpServerResponse::StatusCode::BadRequest); // 或其他合适的错误码
                     }
                 });

    // 6. 标记所有未读通知为已读 (POST /api/notifications/mark-all-read)
    server.route("/api/notifications/mark-all-read", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/notifications/mark-all-read";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权标记所有通知。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     int userId = userPayloadFromToken.value("userId").toInt();
                     int markedCount = 0;
                     QString message;
                     if (m_db->markAllNotificationsAsRead(userId, markedCount, message)) {
                         qInfo() << "用户 " << userId << " 成功标记所有未读通知为已读，数量：" << markedCount;
                         // return jsonResponse(QJsonObject{{"success", true}, {"markedCount", markedCount}});
                         return noContentResponse();
                     } else {
                         qWarning() << "用户 " << userId << " 标记所有未读通知为已读失败: " << message;
                         return errorResponse(message, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });


    qInfo() << "学生与教师通用功能路由配置完成。";

    qInfo() << "开始配置学生功能路由...";

    // =============================================
    // 四、学生功能 (Student Features)
    // =============================================

    // 1. 获取可选课程列表 (GET /api/courses/selectable)
    server.route("/api/courses/selectable", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/courses/selectable";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取可选课程。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "student") {
                         return errorResponse("只有学生才能获取可选课程列表。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     bool semesterIdPresent, semesterIdOk;
                     QVariant semesterIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", semesterIdPresent, semesterIdOk);
                     if (!semesterIdPresent || !semesterIdOk || !semesterIdVar.isValid() || semesterIdVar.toInt() <=0) {
                         return errorResponse("必须提供有效的 'semesterId' 查询参数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = semesterIdVar.toInt();
                     int studentUserId = userPayloadFromToken.value("userId").toInt(); // 这是 users.user_id

                     QJsonArray selectableCourses = m_db->getSelectableCourses(semesterId, studentUserId);
                     qInfo() << "学生 (User ID: " << studentUserId << ") 获取学期 " << semesterId << " 的可选课程成功，数量：" << selectableCourses.count();
                     return jsonResponse(selectableCourses);
                 });

    // 2. 获取我的选课记录 (GET /api/enrollments/my)
    server.route("/api/enrollments/my", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/enrollments/my";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取选课记录。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "student") {
                         return errorResponse("只有学生才能获取选课记录。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     bool semesterIdPresent, semesterIdOk;
                     QVariant semesterIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", semesterIdPresent, semesterIdOk);
                     if (!semesterIdPresent || !semesterIdOk || !semesterIdVar.isValid() || semesterIdVar.toInt() <=0) {
                         return errorResponse("必须提供有效的 'semesterId' 查询参数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = semesterIdVar.toInt();
                     int studentUserId = userPayloadFromToken.value("userId").toInt();

                     QJsonArray myEnrollments = m_db->getMyEnrollments(studentUserId, semesterId);
                     qInfo() << "学生 (User ID: " << studentUserId << ") 获取学期 " << semesterId << " 的选课记录成功，数量：" << myEnrollments.count();
                     return jsonResponse(myEnrollments);
                 });

    // 3. 学生执行选课操作 (POST /api/enrollments)
    server.route("/api/enrollments", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/enrollments";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权执行选课操作。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "student") {
                         return errorResponse("只有学生才能执行选课操作。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     QJsonObject bodyJson;
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     qDebug()<<bodyJson["schedule_id"];
                     if (!bodyJson.contains("schedule_id") || !bodyJson.value("schedule_id").isDouble()) {
                         return errorResponse("请求体中必须包含有效的 'scheduleId' (number)。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int scheduleId = bodyJson.value("schedule_id").toInt();
                     int studentUserId = userPayloadFromToken.value("userId").toInt();

                     // SqlServer::enrollCourse 需要 student_db_id (学号) 和 semester_id
                     // 我们需要从 studentUserId 获取 student_db_id
                     // 并且，API 请求中没有 semesterId，但 enrollCourse 需要它进行验证。
                     // 这意味着 semesterId 要么从 scheduleId 间接推断（不推荐，增加复杂性），
                     // 要么 API 请求也应该包含 semesterId，或者从当前激活学期获取。
                     // 我们先尝试从当前激活学期获取 semesterId。

                     QJsonObject currentSemester = m_db->getCurrentSemesterInfo();
                     if (currentSemester.isEmpty()) {
                         return errorResponse("无法确定当前学期，选课操作失败。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = currentSemester.value("semester_id").toInt();

                     QJsonObject studentProfile = m_db->getUserProfile(studentUserId);
                     QString studentDbId = studentProfile.value("student_id").toString(); // students.student_id

                     if (studentDbId.isEmpty()) {
                         qWarning() << "POST /api/enrollments: 学生 (User ID: " << studentUserId << ") 未找到对应的学号。";
                         return errorResponse("无法获取学生学号以进行选课。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QString enrollMessage;
                     int newEnrollmentId = m_db->enrollCourse(studentDbId, scheduleId, semesterId, enrollMessage);

                     if (newEnrollmentId > 0) {
                         qInfo() << "学生 " << studentDbId << " 选课 (Schedule ID: " << scheduleId << ") 成功，Enrollment ID: " << newEnrollmentId;
                         // API 清单要求返回 EnrollmentRecord 或成功消息
                         // 为了简单，先返回成功消息。如果需要EnrollmentRecord，则需要重新查询。
                         return jsonResponse(QJsonObject{{"message", enrollMessage}, {"enrollmentId", newEnrollmentId}}, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "学生 " << studentDbId << " 选课 (Schedule ID: " << scheduleId << ") 失败: " << enrollMessage;
                         // 根据 enrollMessage 的内容判断是 BadRequest 还是 Conflict
                         if (enrollMessage.contains("full") || enrollMessage.contains("conflict") || enrollMessage.contains("already enrolled")) {
                             return errorResponse(enrollMessage, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse(enrollMessage, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 4. 学生执行退课操作 (DELETE /api/enrollments/{enrollmentId})
    server.route("/api/enrollments/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int enrollmentId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     // <arg> 会被捕获到 enrollmentId
                     qDebug() << "收到请求: DELETE /api/enrollments/" << enrollmentId;
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权执行退课操作。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "student") {
                         return errorResponse("只有学生才能执行退课操作。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     int studentUserId = userPayloadFromToken.value("userId").toInt();
                     QJsonObject studentProfile = m_db->getUserProfile(studentUserId);
                     QString studentDbId = studentProfile.value("student_id").toString();

                     if (studentDbId.isEmpty()) {
                         qWarning() << "DELETE /api/enrollments: 学生 (User ID: " << studentUserId << ") 未找到对应的学号。";
                         return errorResponse("无法获取学生学号以进行退课。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QString withdrawMessage;
                     if (m_db->withdrawCourse(enrollmentId, studentDbId, withdrawMessage)) {
                         qInfo() << "学生 " << studentDbId << " 退课 (Enrollment ID: " << enrollmentId << ") 成功。";
                         // API清单: "成功 204 No Content 或 200 OK { "message": "退课成功" }"
                         return noContentResponse();
                         // return jsonResponse(QJsonObject{{"message", withdrawMessage}});
                     } else {
                         qWarning() << "学生 " << studentDbId << " 退课 (Enrollment ID: " << enrollmentId << ") 失败: " << withdrawMessage;
                         if(withdrawMessage.contains("deadline") || withdrawMessage.contains("not found") || withdrawMessage.contains("not enrolled")) {
                             return errorResponse(withdrawMessage, QHttpServerResponse::StatusCode::BadRequest); // 或 NotFound
                         }
                         return errorResponse(withdrawMessage, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    qInfo() << "学生功能路由配置完成。";
    qInfo() << "开始配置教师功能路由...";

    // =============================================
    // 五、教师功能 (Teacher Features)
    // =============================================

    // 1. 获取教师的教学安排 (GET /api/schedules/my-taught)
    server.route("/api/schedules/my-taught", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/schedules/my-taught";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取教学安排。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能获取教学安排。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     bool semesterIdPresent, semesterIdOk;
                     QVariant semesterIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", semesterIdPresent, semesterIdOk);
                     if (!semesterIdPresent || !semesterIdOk || !semesterIdVar.isValid() || semesterIdVar.toInt() <=0) {
                         return errorResponse("必须提供有效的 'semesterId' 查询参数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = semesterIdVar.toInt();
                     int teacherUserId = userPayloadFromToken.value("userId").toInt();

                     // 需要从 teacherUserId 获取 teacher_db_id (工号)
                     QJsonObject teacherProfile = m_db->getUserProfile(teacherUserId);
                     QString teacherDbId = teacherProfile.value("teacher_id").toString();

                     if (teacherDbId.isEmpty()) {
                         qWarning() << "GET /api/schedules/my-taught: 教师 (User ID: " << teacherUserId << ") 未找到对应的教师工号。";
                         return errorResponse("无法获取教师信息以查询教学安排。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QJsonArray taughtSchedules = m_db->getTaughtSchedulesByTeacher(teacherDbId, semesterId);
                     qInfo() << "教师 " << teacherDbId << " (User ID: " << teacherUserId << ") 获取学期 " << semesterId
                             << " 的教学安排成功，数量：" << taughtSchedules.count();
                     for( QJsonValueRef i:taughtSchedules) {
                         auto tem=i.toObject();
                         tem["weeks"]=RequestParser::binaryToRangeString(tem["weeks"].toString());
                         i=tem;

                     }
                     return jsonResponse(taughtSchedules);
                 });

    // 2. 获取教师的授课列表 (简要信息，用于发布作业) (GET /api/courses/my-taught)
    server.route("/api/courses/my-taught", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/courses/my-taught";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取授课列表。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能获取授课列表。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     bool semesterIdPresent, semesterIdOk;
                     QVariant semesterIdVar = RequestParser::getQueryParamAsInt(request.query(), "semesterId", semesterIdPresent, semesterIdOk);
                     if (!semesterIdPresent || !semesterIdOk || !semesterIdVar.isValid() || semesterIdVar.toInt() <=0) {
                         return errorResponse("必须提供有效的 'semesterId' 查询参数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     int semesterId = semesterIdVar.toInt();
                     int teacherUserId = userPayloadFromToken.value("userId").toInt();

                     QJsonObject teacherProfile = m_db->getUserProfile(teacherUserId);
                     QString teacherDbId = teacherProfile.value("teacher_id").toString();

                     if (teacherDbId.isEmpty()) {
                         qWarning() << "GET /api/courses/my-taught: 教师 (User ID: " << teacherUserId << ") 未找到对应的教师工号。";
                         return errorResponse("无法获取教师信息以查询授课列表。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QJsonArray taughtCoursesShort = m_db->getTaughtCoursesShortByTeacher(teacherDbId, semesterId);
                     qInfo() << "教师 " << teacherDbId << " (User ID: " << teacherUserId << ") 获取学期 " << semesterId
                             << " 的授课简要列表成功，数量：" << taughtCoursesShort.count();
                     return jsonResponse(taughtCoursesShort);
                 });

    // 3. 提交调课申请 (POST /api/requests/schedule-change)
    server.route("/api/requests/schedule-change", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/requests/schedule-change";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权提交调课申请。", QHttpServerResponse::StatusCode::Unauthorized);
                     }

                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能提交调课申请。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     QJsonObject bodyJson; // 这是 ScheduleChangeRequestPayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     bodyJson["proposed_weeks"]=RequestParser::mapInputToBitString( bodyJson["proposed_weeks"].toString());

                     // 校验 bodyJson 是否符合 ScheduleChangeRequestPayload 的结构
                     // 例如，检查必需字段：original_schedule_id, proposed_section_id, proposed_week_day, proposed_weeks, proposed_classroom_id, reason
                     QStringList requiredFields = {"original_schedule_id", "proposed_section_id", "proposed_week_day", "proposed_weeks", "proposed_classroom_id", "reason"};
                     for(const QString& field : requiredFields) {
                         if(!bodyJson.contains(field)){
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }


                     int teacherUserId = userPayloadFromToken.value("userId").toInt();
                     QJsonObject teacherProfile = m_db->getUserProfile(teacherUserId);
                     QString teacherDbId = teacherProfile.value("teacher_id").toString();

                     if (teacherDbId.isEmpty()) {
                         qWarning() << "POST /api/requests/schedule-change: 教师 (User ID: " << teacherUserId << ") 未找到对应的教师工号。";
                         return errorResponse("无法获取教师信息以提交申请。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QString requestMessage;
                     int newRequestId = m_db->createScheduleChangeRequest(teacherDbId, bodyJson, requestMessage);

                     if (newRequestId > 0) {
                         qInfo() << "教师 " << teacherDbId << " 提交调课申请成功，Request ID: " << newRequestId;
                         // API清单要求返回 TeacherRequest (新创建的申请记录)
                         // 为此，需要根据 newRequestId 重新查询该申请的完整信息。
                         // 简化：先返回ID和成功消息
                         QJsonObject responseObj;
                         responseObj["message"] = requestMessage;
                         responseObj["requestId"] = newRequestId;
                         // 实际应该查询并返回完整的 TeacherRequest 对象
                         // QJsonObject newRequestDetails = m_db->getSingleRequestDetails(newRequestId, "schedule_change");
                         // if(!newRequestDetails.isEmpty()) return jsonResponse(newRequestDetails, QHttpServerResponse::StatusCode::Created);
                         return jsonResponse(responseObj, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "教师 " << teacherDbId << " 提交调课申请失败: " << requestMessage;
                         return errorResponse(requestMessage, QHttpServerResponse::StatusCode::BadRequest); // 或其他适当错误码
                     }
                 });

    // 4. 提交考试安排申请 (POST /api/requests/exam-arrangement)
    server.route("/api/requests/exam-arrangement", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/requests/exam-arrangement";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权提交考试安排申请。", QHttpServerResponse::StatusCode::Unauthorized);
                     }
                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能提交考试安排申请。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     QJsonObject bodyJson; // ExamRequestPayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 校验 ExamRequestPayload 必需字段
                     QStringList requiredExamFields = {"courseId", "examType", "examDate", "sectionId", "duration"};
                     for(const QString& field : requiredExamFields) {
                         if(!bodyJson.contains(field)){
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     // classroomId 和 reason 是可选的

                     int teacherUserId = userPayloadFromToken.value("userId").toInt();
                     QJsonObject teacherProfile = m_db->getUserProfile(teacherUserId);
                     QString teacherDbId = teacherProfile.value("teacher_id").toString();

                     if (teacherDbId.isEmpty()) {
                         qWarning() << "POST /api/requests/exam-arrangement: 教师 (User ID: " << teacherUserId << ") 未找到对应的教师工号。";
                         return errorResponse("无法获取教师信息以提交申请。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QString requestMessage;
                     int newRequestId = m_db->createExamArrangementRequest(teacherDbId, bodyJson, requestMessage);

                     if (newRequestId > 0) {
                         qInfo() << "教师 " << teacherDbId << " 提交考试安排申请成功，Request ID: " << newRequestId;
                         QJsonObject responseObj;
                         responseObj["message"] = requestMessage;
                         responseObj["requestId"] = newRequestId;
                         // 实际应该查询并返回完整的 TeacherRequest 对象
                         return jsonResponse(responseObj, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "教师 " << teacherDbId << " 提交考试安排申请失败: " << requestMessage;
                         return errorResponse(requestMessage, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 5. 获取我的所有申请记录 (GET /api/requests/my)
    server.route("/api/requests/my", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/requests/my";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权获取申请记录。", QHttpServerResponse::StatusCode::Unauthorized);
                     }
                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能获取其申请记录。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     int teacherUserId = userPayloadFromToken.value("userId").toInt();
                     QJsonObject teacherProfile = m_db->getUserProfile(teacherUserId);
                     QString teacherDbId = teacherProfile.value("teacher_id").toString();

                     if (teacherDbId.isEmpty()) {
                         qWarning() << "GET /api/requests/my: 教师 (User ID: " << teacherUserId << ") 未找到对应的教师工号。";
                         return errorResponse("无法获取教师信息以查询申请记录。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QJsonArray myRequests = m_db->getMyRequests(teacherDbId);
                     qInfo() << "教师 " << teacherDbId << " 获取其所有申请记录成功，数量：" << myRequests.count();
                     return jsonResponse(myRequests);
                 });

    // 6. 发布作业/课程通知 (POST /api/assignments)
    server.route("/api/assignments", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/assignments";
                     QJsonObject userPayloadFromToken;
                     if (!JwtMiddleware::verifyToken(request, userPayloadFromToken)) {
                         return errorResponse("未授权发布作业/通知。", QHttpServerResponse::StatusCode::Unauthorized);
                     }
                     if (userPayloadFromToken.value("role").toString() != "teacher") {
                         return errorResponse("只有教师才能发布作业/通知。", QHttpServerResponse::StatusCode::Forbidden);
                     }

                     QJsonObject bodyJson; // AssignmentPayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 校验 AssignmentPayload 必需字段
                     QStringList requiredAssignFields = {"title", "content", "course_id"}; // courseId 也是必需的，用于确定通知对象
                     for(const QString& field : requiredAssignFields) {
                         if(!bodyJson.contains(field)){
                             // courseId 在前端的 AssignmentPayload 中是可选的 (courseId?: number)
                             // 但后端 SqlServer::createAssignmentNotification 中 courseId 是必须的
                             // 这里我们强制 courseId 必须提供
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     if(!bodyJson.value("course_id").isDouble() || bodyJson.value("course_id").toInt() <=0){
                         return errorResponse("请求体中 courseId 必须是有效的正整数。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     int teacherUserId = userPayloadFromToken.value("userId").toInt();
                     // teacher_user_id 参数在 SqlServer::createAssignmentNotification 中是 Q_UNUSED(teacher_user_id)
                     // 但我们还是传递它，以备将来使用。

                     QString notificationMessage;
                     if (m_db->createAssignmentNotification(bodyJson, teacherUserId, notificationMessage)) {
                         qInfo() << "教师 (User ID: " << teacherUserId << ") 发布作业/课程通知成功: " << notificationMessage;
                         return jsonResponse(QJsonObject{{"message", notificationMessage}});
                     } else {
                         qWarning() << "教师 (User ID: " << teacherUserId << ") 发布作业/课程通知失败: " << notificationMessage;
                         return errorResponse(notificationMessage, QHttpServerResponse::StatusCode::BadRequest); // 或 InternalServerError
                     }
                 });


    qInfo() << "教师功能路由配置完成。";


    qInfo() << "开始配置管理员-课程管理路由...";

    // =============================================
    // 六、管理员功能 - 课程管理 (Admin Courses)
    // =============================================
    // 所有 /api/admin/* 路由都需要管理员权限

    // 辅助Lambda，用于检查管理员权限
    auto requireAdmin = [&](const QHttpServerRequest &request, QJsonObject &userPayload) -> bool {
        if (!JwtMiddleware::verifyToken(request, userPayload)) {
            return false; // errorResponse 会在外部调用处处理
        }
        if (userPayload.value("role").toString() != "admin") {
            return false; // errorResponse 会在外部调用处处理
        }
        return true;
    };

    // 1. 获取课程列表 (分页/排序/筛选) (GET /api/admin/courses)
    server.route("/api/admin/courses", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/courses";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         // requireAdmin 内部不直接返回response，所以这里判断并返回
                         if (userPayloadFromToken.isEmpty()){ // Token 验证失败
                             return errorResponse("未授权访问课程列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else { // 角色不符
                             return errorResponse("只有管理员才能访问此课程列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     RequestParser::AdminCoursesFilterParams params(request.query());
                     // 前端 AdminCoursesFilterParams 的 filter 结构是 { courseName_like?: string; courseCode_like?: string; }
                     // SqlServer::getCoursesListAdmin 期望的 filter 是一个 QJsonObject，键是数据库字段名或约定的筛选键
                     // 例如 { "courseName_like": "value", "courseCode_like": "value" }

                     QJsonObject filterForDb;
                     if (!params.courseName_like.isEmpty()) {
                         filterForDb["courseName_like"] = params.courseName_like;
                     }
                     if (!params.courseCode_like.isEmpty()) {
                         filterForDb["courseCode_like"] = params.courseCode_like;
                     }
                     // 还可以从 params.filters (ListQueryParams基类中的通用过滤器) 添加其他可能的过滤器
                     // 例如，如果前端发送 filter[year_eq]=2023
                     if(params.filters.contains("year_eq")){
                         filterForDb["year_eq"] = params.filters.value("year_eq").toInt(); // 假设是数字
                     }
                     if(params.filters.contains("semester_eq")){
                         filterForDb["semester_eq"] = params.filters.value("semester_eq").toString();
                     }
                     if(params.filters.contains("credit_eq")){
                         filterForDb["credit_eq"] = params.filters.value("credit_eq").toInt();
                     }


                     QString dbError;
                     QJsonObject coursesResult = m_db->getCoursesListAdmin(
                         params.page,
                         params.pageSize,
                         params.sortField,
                         params.sortOrder,
                         filterForDb,
                         dbError
                         );

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/courses: 数据库错误 - " << dbError;
                         return errorResponse("获取课程列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取课程列表 (Page: " << params.page << ", PageSize: " << params.pageSize
                             << ", Filter: " << QJsonDocument(filterForDb).toJson(QJsonDocument::Compact) << ")。"
                             << "总数：" << coursesResult.value("totalCount").toInt();
                     return jsonResponse(coursesResult);
                 });

    // 2. 创建新课程 (POST /api/admin/courses)
    server.route("/api/admin/courses", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/courses";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权创建课程。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能创建课程。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // CoursePayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QStringList requiredFields = {"course_code", "course_name", "credit", "semester", "year", "max_capacity"};
                     for (const QString& field : requiredFields) {
                         if (!bodyJson.contains(field)) {
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }

                     QString dbCreateError;
                     int newCourseId = m_db->createCourse(bodyJson, dbCreateError);

                     if (newCourseId > 0) {
                         // 创建成功，现在使用 newCourseId 查询完整的课程信息
                         QString dbFetchError;
                         QJsonObject createdCourseDetails = m_db->getCourseDetails(newCourseId, dbFetchError);

                         if (!dbFetchError.isEmpty() || createdCourseDetails.isEmpty()) {
                             qWarning() << "POST /api/admin/courses: 课程创建成功 (ID: " << newCourseId
                                        << ")，但获取其详细信息失败: " << dbFetchError;
                             // 即使获取详情失败，课程本身已创建。可以返回一个包含ID的成功消息。
                             return jsonResponse(
                                 QJsonObject{
                                     {"message", "课程创建成功，但获取详细信息时出错。"},
                                     {"course_id", newCourseId}
                                 },
                                 QHttpServerResponse::StatusCode::Created // 仍是 201 Created
                                 );
                         }

                         qInfo() << "管理员成功创建课程，ID: " << newCourseId << ", 名称: " << createdCourseDetails.value("course_name").toString();
                         return jsonResponse(createdCourseDetails, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "POST /api/admin/courses: 创建课程失败 - " << dbCreateError;
                         if (dbCreateError.contains("already exists") || dbCreateError.contains("已存在")) {
                             return errorResponse(dbCreateError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse("创建课程失败: " + dbCreateError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 更新指定课程信息 (PUT /api/admin/courses/{courseId})
    server.route("/api/admin/courses/<arg>", QHttpServerRequest::Method::Put,
                 [&](int courseId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: PUT /api/admin/courses/" << courseId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权更新课程。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能更新课程。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // Partial<CoursePayload>
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         if(request.body().isEmpty()){
                             return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     if (bodyJson.isEmpty()) {
                         return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QString dbUpdateError;
                     if (m_db->updateCourse(courseId, bodyJson, dbUpdateError)) {
                         // 更新成功，现在使用 courseId 查询更新后的完整课程信息
                         QString dbFetchError;
                         QJsonObject updatedCourseDetails = m_db->getCourseDetails(courseId, dbFetchError);

                         if (!dbFetchError.isEmpty() || updatedCourseDetails.isEmpty()) {
                             qWarning() << "PUT /api/admin/courses/" << courseId << ": 课程更新成功，但获取其更新后详细信息失败: " << dbFetchError;
                             return jsonResponse(
                                 QJsonObject{
                                     {"message", "课程更新成功，但获取详细信息时出错。"},
                                     {"course_id", courseId}
                                 },
                                 QHttpServerResponse::StatusCode::Ok // 仍是 200 Ok
                                 );
                         }
                         qInfo() << "管理员成功更新课程 ID: " << courseId;
                         return jsonResponse(updatedCourseDetails, QHttpServerResponse::StatusCode::Ok);
                     } else {
                         qWarning() << "PUT /api/admin/courses/" << courseId << ": 更新课程失败 - " << dbUpdateError;
                         if (dbUpdateError.contains("not found") || dbUpdateError.contains("未找到")) {
                             return errorResponse(dbUpdateError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         if (dbUpdateError.contains("already exists") || dbUpdateError.contains("已存在")) {
                             return errorResponse(dbUpdateError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         if (dbUpdateError.contains("No changes made") || dbUpdateError.contains("未做更改")) { // 来自 SqlServer::updateCourse 的提示
                             // 如果没有实际更改，可以返回200 OK和原对象，或者一个特定消息
                             // 为了符合“返回更新后的对象”，我们还是尝试获取并返回
                             QString dbFetchError;
                             QJsonObject currentCourseDetails = m_db->getCourseDetails(courseId, dbFetchError);
                             if (!dbFetchError.isEmpty() || currentCourseDetails.isEmpty()) {
                                 return errorResponse("未检测到课程更改，且获取当前课程详情失败。", QHttpServerResponse::StatusCode::Ok);
                             }
                             return jsonResponse(currentCourseDetails, QHttpServerResponse::StatusCode::Ok);
                         }
                         return errorResponse("更新课程失败: " + dbUpdateError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 4. 删除指定课程 (DELETE /api/admin/courses/{courseId})
    server.route("/api/admin/courses/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int courseId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: DELETE /api/admin/courses/" << courseId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权删除课程。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能删除课程。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QString dbError;
                     if (m_db->deleteCourse(courseId, dbError)) {
                         qInfo() << "管理员成功删除课程 ID: " << courseId;
                         return noContentResponse();
                     } else {
                         qWarning() << "DELETE /api/admin/courses/" << courseId << ": 删除课程失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         // 例如："课程已被排课，无法删除"
                         if (dbError.contains("referenced by") || dbError.contains("被引用") || dbError.contains("无法删除")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 或 409 Conflict
                         }
                         return errorResponse("删除课程失败: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });


    qInfo() << "管理员-课程管理路由配置完成。";

    qInfo() << "开始配置管理员-教室管理路由...";

    // =============================================
    // 七、管理员功能 - 教室管理 (Admin Classrooms)
    // =============================================

    // 1. 获取教室列表 (分页/排序/筛选) (GET /api/admin/classrooms)
    server.route("/api/admin/classrooms", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/classrooms";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权访问教室列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能访问教室列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     RequestParser::AdminClassroomsFilterParams params(request.query());
                     // SqlServer::getClassroomsList 期望的 filter 是一个 QJsonObject
                     // 例如 { "building_like": "value", "equipment_eq": "value", "min_capacity_gte": 100 }

                     QJsonObject filterForDb;
                     if (!params.building_like.isEmpty()) {
                         filterForDb["building_like"] = params.building_like;
                     }
                     if (!params.equipment_eq.isEmpty()) { // 前端如果传空字符串代表不过滤此项，这里直接传递
                         filterForDb["equipment_eq"] = params.equipment_eq;
                     }
                     // 从通用 filters 添加其他可能的过滤器，如 min_capacity_gte, max_capacity_lte
                     // 这些在API清单中是getClassroomsList的filter参数，但前端AdminClassroomParams没有显式列出
                     // 所以我们从通用 params.filters 中查找
                     if(params.filters.contains("room_number_like")){
                         filterForDb["room_number_like"] = params.filters.value("room_number_like").toString();
                     }
                     if(params.filters.contains("min_capacity_gte")){
                         bool ok;
                         int cap = params.filters.value("min_capacity_gte").toInt(&ok);
                         if(ok) filterForDb["min_capacity_gte"] = cap;
                     }
                     if(params.filters.contains("max_capacity_lte")){
                         bool ok;
                         int cap = params.filters.value("max_capacity_lte").toInt(&ok);
                         if(ok) filterForDb["max_capacity_lte"] = cap;
                     }


                     QString dbError;
                     QJsonObject classroomsResult = m_db->getClassroomsList(
                         params.page,
                         params.pageSize,
                         params.sortField,
                         params.sortOrder,
                         filterForDb,
                         dbError
                         );

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/classrooms: 数据库错误 - " << dbError;
                         return errorResponse("获取教室列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取教室列表 (Page: " << params.page << ", PageSize: " << params.pageSize
                             << ", Filter: " << QJsonDocument(filterForDb).toJson(QJsonDocument::Compact) << ")。"
                             << "总数：" << classroomsResult.value("totalCount").toInt();
                     return jsonResponse(classroomsResult);
                 });

    // 2. 创建新教室 (POST /api/admin/classrooms)
    server.route("/api/admin/classrooms", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/classrooms";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权创建教室。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能创建教室。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // ClassroomPayload (不含 classroomId)
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 校验 ClassroomPayload 必需字段 (building, room_number, capacity, equipment)
                     QStringList requiredFields = {"building", "room_number", "capacity", "equipment"};
                     for (const QString& field : requiredFields) {
                         if (!bodyJson.contains(field)) {
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     if (!bodyJson.value("capacity").isDouble() || bodyJson.value("capacity").toInt() <= 0) {
                         return errorResponse("capacity 必须是正整数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     QStringList validEquipments = {"basic", "multimedia", "lab"};
                     if (!validEquipments.contains(bodyJson.value("equipment").toString().toLower())) {
                         return errorResponse("无效的 equipment 类型。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     QString dbError;
                     int newClassroomId = m_db->createClassroom(bodyJson, dbError);

                     if (newClassroomId > 0) {
                         QJsonObject createdClassroom = bodyJson;
                         createdClassroom["classroom_id"] = newClassroomId;
                         qInfo() << "管理员成功创建教室，ID: " << newClassroomId << ", 位置: "
                                 << bodyJson.value("building").toString() << "-" << bodyJson.value("room_number").toString();
                         return jsonResponse(createdClassroom, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "POST /api/admin/classrooms: 创建教室失败 - " << dbError;
                         if (dbError.contains("already exists") || dbError.contains("已存在")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse("创建教室失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 更新指定教室信息 (PUT /api/admin/classrooms/{classroomId})
    server.route("/api/admin/classrooms/<arg>", QHttpServerRequest::Method::Put,
                 [&](int classroomId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: PUT /api/admin/classrooms/" << classroomId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权更新教室。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能更新教室。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // Partial<ClassroomPayload>
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         if(request.body().isEmpty()){
                             return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if (bodyJson.isEmpty()) {
                         return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     if (bodyJson.contains("capacity") && (!bodyJson.value("capacity").isDouble() || bodyJson.value("capacity").toInt() <= 0 )) {
                         return errorResponse("如果提供 capacity，则必须是正整数。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if (bodyJson.contains("equipment")) {
                         QStringList validEquipments = {"basic", "multimedia", "lab"};
                         if (!validEquipments.contains(bodyJson.value("equipment").toString().toLower())) {
                             return errorResponse("无效的 equipment 类型。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }

                     QString dbError;
                     if (m_db->updateClassroom(classroomId, bodyJson, dbError)) {
                         // 教室更新成功，现在获取并返回更新后的完整对象
                         QJsonObject updatedClassroomDetails = m_db->getClassroomDetails(classroomId);
                         if (!updatedClassroomDetails.isEmpty()) {
                             qInfo() << "管理员成功更新教室 ID: " << classroomId << "。返回更新后详情。";
                             return jsonResponse(updatedClassroomDetails);
                         } else {
                             // 这种情况不应该发生，如果更新成功，应该能获取到详情
                             qWarning() << "PUT /api/admin/classrooms/" << classroomId << ": 教室更新成功但无法获取更新后详情。";
                             return errorResponse("教室更新成功但无法获取更新后详情。", QHttpServerResponse::StatusCode::InternalServerError); // 或者返回一个简单的成功消息
                         }
                     } else {
                         qWarning() << "PUT /api/admin/classrooms/" << classroomId << ": 更新教室失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         if (dbError.contains("already exists") || dbError.contains("已存在")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         if (dbError.contains("No changes made") || dbError.contains("未做更改")) {
                             // 如果没有实际更改，仍获取当前详情返回
                             QJsonObject currentClassroomDetails = m_db->getClassroomDetails(classroomId);
                             if(!currentClassroomDetails.isEmpty()){
                                 return jsonResponse(currentClassroomDetails); // 返回当前对象，因为没有更改
                             }
                             return jsonResponse(QJsonObject{{"message", dbError}, {"classroomId", classroomId}});
                         }
                         return errorResponse("更新教室失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 4. 删除指定教室 (DELETE /api/admin/classrooms/{classroomId})
    server.route("/api/admin/classrooms/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int classroomId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: DELETE /api/admin/classrooms/" << classroomId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权删除教室。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能删除教室。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QString dbError;
                     if (m_db->deleteClassroom(classroomId, dbError)) {
                         qInfo() << "管理员成功删除教室 ID: " << classroomId;
                         return noContentResponse();
                     } else {
                         qWarning() << "DELETE /api/admin/classrooms/" << classroomId << ": 删除教室失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         if (dbError.contains("referenced by") || dbError.contains("被引用") || dbError.contains("被占用")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 或 409 Conflict
                         }
                         return errorResponse("删除教室失败: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });

    qInfo() << "管理员-教室管理路由配置完成。";

    qInfo() << "开始配置管理员-学期管理路由...";

    // =============================================
    // 八、管理员功能 - 学期管理 (Admin Semesters)
    // =============================================

    // 1. 获取学期列表 (分页/排序) (GET /api/admin/semesters)
    server.route("/api/admin/semesters", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/semesters";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权访问学期列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能访问学期列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     // AdminSemesters 没有特定的 filter，只有分页和排序
                     RequestParser::ListQueryParams params(request.query());

                     QString dbError;
                     // SqlServer::getSemestersList 的参数是 (page, pageSize, sortField, sortOrder, error)
                     QJsonObject semestersResult = m_db->getSemestersList(
                         params.page,
                         params.pageSize,
                         params.sortField,
                         params.sortOrder,
                         dbError
                         );

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/semesters: 数据库错误 - " << dbError;
                         return errorResponse("获取学期列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取学期列表 (Page: " << params.page << ", PageSize: " << params.pageSize
                             << ", Sort: " << params.sortField << " " << params.sortOrder << ")。"
                             << "总数：" << semestersResult.value("totalCount").toInt();
                     return jsonResponse(semestersResult);
                 });

    // 2. 创建新学期 (POST /api/admin/semesters)
    server.route("/api/admin/semesters", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/semesters";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权创建学期。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能创建学期。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // SemesterPayload (不含 semesterId, isCurrent)
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 校验 SemesterPayload 必需字段 (semester_name, start_date, end_date, term_type, academic_year)
                     QStringList requiredFields = {"semester_name", "start_date", "end_date", "term_type", "academic_year"};
                     for (const QString& field : requiredFields) {
                         if (!bodyJson.contains(field) || bodyJson.value(field).toString().isEmpty()) { // 确保不为空字符串
                             return errorResponse(QString("请求体缺少或字段为空: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     // 进一步校验日期格式和学期类型
                     QDate startDate = QDate::fromString(bodyJson.value("start_date").toString(), Qt::ISODate);
                     QDate endDate = QDate::fromString(bodyJson.value("end_date").toString(), Qt::ISODate);
                     if(!startDate.isValid() || !endDate.isValid()){
                         return errorResponse("start_date 或 end_date 日期格式无效 (应为 YYYY-MM-DD)。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if(startDate >= endDate){
                         return errorResponse("start_date 必须早于 end_date。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     QStringList validTermTypes = {"spring", "fall"};
                     if(!validTermTypes.contains(bodyJson.value("term_type").toString().toLower())){
                         return errorResponse("term_type 无效，必须是 'spring' 或 'fall'。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     // academic_year 格式 (YYYY-YYYY) 也可做简单校验
                     if(!bodyJson.value("academic_year").toString().contains(QRegularExpression("^\\d{4}-\\d{4}$"))){
                         return errorResponse("academic_year 格式无效，应为 YYYY-YYYY。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     QString dbError;
                     int newSemesterId = m_db->createSemester(bodyJson, dbError);

                     if (newSemesterId > 0) {
                         QJsonObject createdSemester = bodyJson;
                         createdSemester["semester_id"] = newSemesterId;
                         createdSemester["is_current"] = false; // 新建时默认为非当前
                         qInfo() << "管理员成功创建学期，ID: " << newSemesterId << ", 名称: " << bodyJson.value("semester_name").toString();
                         return jsonResponse(createdSemester, QHttpServerResponse::StatusCode::Created);
                     } else {
                         qWarning() << "POST /api/admin/semesters: 创建学期失败 - " << dbError;
                         if (dbError.contains("already exists") || dbError.contains("已存在") || dbError.contains("duplicate key")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse("创建学期失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 更新指定学期信息 (PUT /api/admin/semesters/{semesterId})
    server.route("/api/admin/semesters/<arg>", QHttpServerRequest::Method::Put,
                 [&](int semesterId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: PUT /api/admin/semesters/" << semesterId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权更新学期。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能更新学期。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // Partial<SemesterPayload>
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         if(request.body().isEmpty()){
                             return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if (bodyJson.isEmpty()) {
                         return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QDate newStartDate, newEndDate;
                     bool startDateProvided = bodyJson.contains("start_date");
                     bool endDateProvided = bodyJson.contains("end_date");
                     if(startDateProvided){
                         newStartDate = QDate::fromString(bodyJson.value("start_date").toString(), Qt::ISODate);
                         if(!newStartDate.isValid()) return errorResponse("提供的 start_date 日期格式无效。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if(endDateProvided){
                         newEndDate = QDate::fromString(bodyJson.value("end_date").toString(), Qt::ISODate);
                         if(!newEndDate.isValid()) return errorResponse("提供的 end_date 日期格式无效。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     QString dbError;
                     if (m_db->updateSemester(semesterId, bodyJson, dbError)) {
                         // 学期更新成功或无更改，获取并返回更新/当前后的完整对象
                         QJsonObject updatedSemesterDetails = m_db->getSemesterDetails(semesterId);
                         if (!updatedSemesterDetails.isEmpty()) {
                             qInfo() << "管理员操作学期 ID: " << semesterId << "。返回学期详情。Message: " << dbError;
                             return jsonResponse(updatedSemesterDetails);
                         } else {
                             qWarning() << "PUT /api/admin/semesters/" << semesterId << ": 学期操作成功但无法获取详情。";
                             return errorResponse("学期操作成功但无法获取详情。", QHttpServerResponse::StatusCode::InternalServerError);
                         }
                     } else {
                         qWarning() << "PUT /api/admin/semesters/" << semesterId << ": 更新学期失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         return errorResponse("更新学期失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });


    // 4. 删除指定学期 (DELETE /api/admin/semesters/{semesterId})
    server.route("/api/admin/semesters/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int semesterId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: DELETE /api/admin/semesters/" << semesterId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权删除学期。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能删除学期。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QString dbError;
                     if (m_db->deleteSemester(semesterId, dbError)) {
                         qInfo() << "管理员成功删除学期 ID: " << semesterId;
                         return noContentResponse();
                     } else {
                         qWarning() << "DELETE /api/admin/semesters/" << semesterId << ": 删除学期失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("不存在")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         // 例如："无法删除当前激活的学期" 或 "被其他记录引用"
                         if (dbError.contains("无法删除") || dbError.contains("被引用")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 或 409 Conflict
                         }
                         return errorResponse("删除学期失败: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });

    // 5. 激活指定学期 (POST /api/admin/semesters/{semesterId}/activate)
    server.route("/api/admin/semesters/<arg>/activate", QHttpServerRequest::Method::Post,
                 [&](int semesterId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/semesters/" << semesterId << "/activate";
                     Q_UNUSED(request); // 此请求通常没有请求体
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) { // 即使没有请求体，认证头还是需要的
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权激活学期。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能激活学期。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QString dbError;
                     if (m_db->activateSemester(semesterId, dbError)) {
                         qInfo() << "管理员成功激活学期 ID: " << semesterId;
                         return jsonResponse(QJsonObject{{"success", true}, {"message", dbError}});
                     } else {
                         qWarning() << "POST /api/admin/semesters/" << semesterId << "/activate: 激活学期失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         return errorResponse("激活学期失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });


    qInfo() << "管理员-学期管理路由配置完成。";



    qInfo() << "开始配置管理员-用户管理路由...";

    // =============================================
    // 九、管理员功能 - 用户管理 (Admin Users)
    // =============================================

    // 1. 获取用户列表 (分页/排序/筛选) (GET /api/admin/users)
    server.route("/api/admin/users", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/users";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权访问用户列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能访问用户列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     RequestParser::AdminUsersFilterParams params(request.query());
                     // SqlServer::getUsersListAdmin 期望的 filter 是一个 QJsonObject
                     // 例如 { "role_eq": "student", "username_like": "john" }

                     QJsonObject filterForDb;
                     if (!params.filterRole.isEmpty()) {
                         filterForDb["role_eq"] = params.filterRole;
                     }
                     if (!params.filterUsername_like.isEmpty()) {
                         filterForDb["username_like"] = params.filterUsername_like;
                     }
                     // 也可以从通用 filters 中添加其他，如 email_like, phone_like
                     if(params.filters.contains("email_like")){
                         filterForDb["email_like"] = params.filters.value("email_like").toString();
                     }
                     if(params.filters.contains("phone_like")){
                         filterForDb["phone_like"] = params.filters.value("phone_like").toString();
                     }


                     QString dbError;
                     QJsonObject usersResult = m_db->getUsersListAdmin(
                         params.page,
                         params.pageSize,
                         params.sortField,
                         params.sortOrder,
                         filterForDb,
                         dbError
                         );

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/users: 数据库错误 - " << dbError;
                         return errorResponse("获取用户列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取用户列表 (Page: " << params.page << ", PageSize: " << params.pageSize
                             << ", Filter: " << QJsonDocument(filterForDb).toJson(QJsonDocument::Compact) << ")。"
                             << "总数：" << usersResult.value("totalCount").toInt();
                     return jsonResponse(usersResult);
                 });

    // 2. 创建新用户 (POST /api/admin/users)
    server.route("/api/admin/users", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/users";
                     QJsonObject userPayloadFromToken; // 操作者
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权创建用户。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能创建用户。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // UserPayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 校验 UserPayload 必需字段 (username, password, role)
                     QStringList requiredFields = {"username", "password", "role"};
                     for (const QString& field : requiredFields) {
                         if (!bodyJson.contains(field) || bodyJson.value(field).toString().isEmpty()) {
                             return errorResponse(QString("请求体缺少或字段为空: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     QString role = bodyJson.value("role").toString().toLower();
                     if (role != "student" && role != "teacher" && role != "admin") {
                         return errorResponse("无效的用户角色。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     // 其他可选字段如 email, phone, class_name, enrollment_year, department, title
                     // 会在 SqlServer::createUserAdmin 内部处理

                     QString dbError;
                     int newUserId = m_db->createUserAdmin(bodyJson, dbError);

                     if (newUserId > 0) {
                         // API清单要求返回 UserDetail (新创建的用户对象)
                         // 需要根据 newUserId 重新查询该用户的完整信息
                         QJsonObject newUserDetails = m_db->getUserProfile(newUserId); // getUserProfile 返回的就是 UserDetail
                         if (!newUserDetails.isEmpty()) {
                             newUserDetails.remove("password_hash"); // 确保不泄露
                             qInfo() << "管理员成功创建用户，ID: " << newUserId << ", 用户名: " << newUserDetails.value("username").toString();
                             return jsonResponse(newUserDetails, QHttpServerResponse::StatusCode::Created);
                         } else {
                             qWarning() << "POST /api/admin/users: 用户创建成功 (ID:" << newUserId << ") 但获取其详情失败。";
                             return jsonResponse(QJsonObject{{"message", "用户创建成功但获取详情失败"}, {"userId", newUserId}}, QHttpServerResponse::StatusCode::Created);
                         }
                     } else {
                         qWarning() << "POST /api/admin/users: 创建用户失败 - " << dbError;
                         if (dbError.contains("already exists") || dbError.contains("已存在") || dbError.contains("duplicate key")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse("创建用户失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 更新指定用户信息 (PUT /api/admin/users/{userId})
    server.route("/api/admin/users/<arg>", QHttpServerRequest::Method::Put,
                 [&](int userIdToUpdate, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: PUT /api/admin/users/" << userIdToUpdate;
                     QJsonObject userPayloadFromToken; // 操作者
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权更新用户信息。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能更新用户信息。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // Partial<UserPayload>
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         if(request.body().isEmpty()){
                             return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if (bodyJson.isEmpty()) {
                         return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // 不能通过此接口修改用户的 username 或 role
                     if (bodyJson.contains("username") || bodyJson.contains("role")) {
                         return errorResponse("不允许通过此接口修改用户名或角色。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     QString dbError;
                     if (m_db->updateUserAdmin(userIdToUpdate, bodyJson, dbError)) {
                         // API清单要求返回 UserDetail (更新后的用户对象)
                         QJsonObject updatedUserDetails = m_db->getUserProfile(userIdToUpdate);
                         if(!updatedUserDetails.isEmpty()){
                             updatedUserDetails.remove("password_hash");
                             qInfo() << "管理员成功更新用户 ID: " << userIdToUpdate;
                             return jsonResponse(updatedUserDetails);
                         } else {
                             qWarning() << "PUT /api/admin/users/" << userIdToUpdate << ": 用户信息更新成功但获取详情失败。";
                             return jsonResponse(QJsonObject{{"message", dbError.isEmpty() ? "用户信息更新成功但获取详情失败" : dbError}});
                         }
                     } else {
                         qWarning() << "PUT /api/admin/users/" << userIdToUpdate << ": 更新用户信息失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("不存在")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         if (dbError.contains("No changes made") || dbError.contains("未做更改")) {
                             // 如果 m_db->updateUserAdmin 返回 true 且 dbError 提示未做更改，应该返回成功
                             // 所以这里假定如果返回false，则是真实错误
                             return jsonResponse(QJsonObject{{"message", dbError}}); // 200 OK 但消息提示未改
                         }
                         return errorResponse("更新用户信息失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 4. 删除指定用户 (DELETE /api/admin/users/{userId})
    server.route("/api/admin/users/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int userIdToDelete, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: DELETE /api/admin/users/" << userIdToDelete;
                     QJsonObject userPayloadFromToken; // 操作者
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权删除用户。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能删除用户。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }
                     int currentAdminUserId = userPayloadFromToken.value("userId").toInt();


                     QString dbError;
                     if (m_db->deleteUserAdmin(userIdToDelete, currentAdminUserId, dbError)) {
                         qInfo() << "管理员 (ID: " << currentAdminUserId << ") 成功删除用户 ID: " << userIdToDelete;
                         return noContentResponse();
                     } else {
                         qWarning() << "DELETE /api/admin/users/" << userIdToDelete << ": 删除用户失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("不存在")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         // 例如："管理员不能删除自己的账户" 或 "被其他记录引用"
                         if (dbError.contains("不能删除") || dbError.contains("被引用")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 或 409 Conflict
                         }
                         return errorResponse("删除用户失败: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });


    qInfo() << "管理员-用户管理路由配置完成。";



    qInfo() << "开始配置管理员-排课管理路由...";

    // =============================================
    // 十、管理员功能 - 排课管理 (Admin Schedules)
    // =============================================

    // 1. 获取排课列表 (分页/排序/筛选) (GET /api/admin/schedules)
    server.route("/api/admin/schedules", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/schedules";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权访问排课列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能访问排课列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     RequestParser::AdminSchedulesFilterParams params(request.query());
                     // SqlServer::getSchedulesListAdmin 期望的 filter 是一个 QJsonObject
                     // 例如 { "courseId_eq": 1, "teacherId_eq": "T001", "semesterId_eq": 2 }
                     // semesterId_eq 是必需的



                     QJsonObject filterForDb;
                     if (params.filterCourseId.isValid() && params.filterCourseId.toInt() > 0) {
                         filterForDb["courseId_eq"] = params.filterCourseId.toInt();
                     }
                     if (params.filterTeacherId.isValid() && !params.filterTeacherId.toString().isEmpty()) {
                         filterForDb["teacherId_eq"] = params.filterTeacherId.toString();
                     }
                     if (params.filterClassroomId.isValid() && params.filterClassroomId.toInt() > 0) {
                         filterForDb["classroomId_eq"] = params.filterClassroomId.toInt();
                     }
                     // 检查 filterSemesterId 是否存在且有效，如果有效则添加筛选，否则不添加（表示查询所有学期）
                     if (params.filterSemesterId.isValid() && params.filterSemesterId.toInt() > 0) {
                         filterForDb["semesterId_eq"] = params.filterSemesterId.toInt();
                     } else {
                         qInfo() << "GET /api/admin/schedules: 未提供有效的学期ID筛选，将返回所有学期的排课。";
                     }

                     if(params.filters.contains("weekDay_eq")){ // 从通用过滤器中获取
                         bool ok;
                         int wd = params.filters.value("weekDay_eq").toInt(&ok);
                         if(ok && wd >=1 && wd <=7) filterForDb["weekDay_eq"] = wd;
                     }
                     if(params.filters.contains("sectionId_eq")){
                         bool ok;
                         int sid = params.filters.value("sectionId_eq").toInt(&ok);
                         if(ok) filterForDb["sectionId_eq"] = sid;
                     }


                     QString dbError;
                     QJsonObject schedulesResult = m_db->getSchedulesListAdmin(
                         params.page,
                         params.pageSize,
                         params.sortField,
                         params.sortOrder,
                         filterForDb,
                         dbError
                         );

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/schedules: 数据库错误 - " << dbError;
                         // "Semester ID filter ... is highly recommended or mandatory" 这个错误是 getSchedulesListAdmin 内部产生的
                         if(dbError.contains("Semester ID filter")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("获取排课列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取排课列表 (Page: " << params.page << ", PageSize: " << params.pageSize
                             << ", Filter: " << QJsonDocument(filterForDb).toJson(QJsonDocument::Compact) << ")。"
                             << "总数：" << schedulesResult.value("totalCount").toInt();
                     return jsonResponse(schedulesResult);
                 });

    // 2. 创建新排课记录 (POST /api/admin/schedules)
    server.route("/api/admin/schedules", QHttpServerRequest::Method::Post,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/schedules";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权创建排课记录。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能创建排课记录。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // SchedulePayload
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // ... (字段校验代码保持不变) ...
                     QStringList requiredFields = {"course_id", "teacher_id", "classroom_id", "section_id", "week_day", "weeks"};


                     for (const QString& field : requiredFields) {
                         if (!bodyJson.contains(field)) {
                             return errorResponse(QString("请求体缺少必需字段: %1").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                         if((field.endsWith("_id") || field == "week_day") && !bodyJson.value(field).isDouble()){
                             if(field=="teacher_id") continue;
                             return errorResponse(QString("字段 %1 必须是数字。").arg(field), QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }
                     int week_day_val = bodyJson.value("week_day").toInt();
                     if(week_day_val < 1 || week_day_val > 7) {
                         return errorResponse("week_day 必须在 1 到 7 之间。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     bodyJson["weeks"]=RequestParser::mapInputToBitString( bodyJson["weeks"].toString());
                     QString weeks_val = bodyJson.value("weeks").toString();
                     qDebug()<<weeks_val;
                     if(weeks_val.isEmpty() || !weeks_val.contains(QRegularExpression("^[01]+$")) || weeks_val.length() > 50) {
                         return errorResponse("weeks 格式无效 (应为0和1组成的字符串，长度1-50)。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     QString dbErrorCreate;
                     int newScheduleId = m_db->createSchedule(bodyJson, dbErrorCreate);

                     if (newScheduleId > 0) {
                         QString dbErrorGet;
                         QJsonObject newScheduleDetails = m_db->getSingleScheduleDetails(newScheduleId, dbErrorGet);
                         if (!newScheduleDetails.isEmpty()) {
                             qInfo() << "管理员成功创建排课记录，ID: " << newScheduleId;
                             return jsonResponse(newScheduleDetails, QHttpServerResponse::StatusCode::Created);
                         } else {
                             qWarning() << "POST /api/admin/schedules: 排课记录创建成功 (ID:" << newScheduleId << ") 但获取其详情失败: " << dbErrorGet;
                             return jsonResponse(QJsonObject{{"message", "排课记录创建成功但获取详情失败"}, {"schedule_id", newScheduleId}}, QHttpServerResponse::StatusCode::Created);
                         }
                     } else {
                         qWarning() << "POST /api/admin/schedules: 创建排课记录失败 - " << dbErrorCreate;
                         if (dbErrorCreate.contains("conflict") || dbErrorCreate.contains("冲突")) {
                             return errorResponse(dbErrorCreate, QHttpServerResponse::StatusCode::Conflict);
                         }
                         if (dbErrorCreate.contains("Invalid") || dbErrorCreate.contains("无效")) {
                             return errorResponse(dbErrorCreate, QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("创建排课记录失败: " + dbErrorCreate, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 更新指定排课记录 (PUT /api/admin/schedules/{scheduleId})
    server.route("/api/admin/schedules/<arg>", QHttpServerRequest::Method::Put,
                 [&](int scheduleId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: PUT /api/admin/schedules/" << scheduleId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权更新排课记录。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能更新排课记录。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QJsonObject bodyJson; // Partial<SchedulePayload>
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         if(request.body().isEmpty()){
                             return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if (bodyJson.isEmpty()) {
                         return errorResponse("请求体不能为空，必须提供要更新的字段。", QHttpServerResponse::StatusCode::BadRequest);
                     }

                     // ... (字段校验代码保持不变) ...
                     if(bodyJson.contains("week_day")){
                         int wd_val = bodyJson.value("week_day").toInt(-1);
                         if(wd_val < 1 || wd_val > 7) return errorResponse("提供的 week_day 无效。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     if(bodyJson.contains("weeks")){
                         QString w_val = bodyJson.value("weeks").toString();
                         if(w_val.isEmpty() || !w_val.contains(QRegularExpression("^[01]+$")) || w_val.length() > 50) {
                             return errorResponse("提供的 weeks 格式无效。", QHttpServerResponse::StatusCode::BadRequest);
                         }
                     }

                     QString dbErrorUpdate;
                     if (m_db->updateSchedule(scheduleId, bodyJson, dbErrorUpdate)) {
                         QString dbErrorGet;
                         QJsonObject updatedScheduleDetails = m_db->getSingleScheduleDetails(scheduleId, dbErrorGet);
                         if (!updatedScheduleDetails.isEmpty()) {
                             qInfo() << "管理员成功更新排课记录 ID: " << scheduleId;
                             return jsonResponse(updatedScheduleDetails);
                         } else {
                             qWarning() << "PUT /api/admin/schedules/" << scheduleId << ": 排课记录更新成功但获取详情失败: " << dbErrorGet;
                             return jsonResponse(QJsonObject{{"message", dbErrorUpdate.isEmpty() ? "排课记录更新成功但获取详情失败" : dbErrorUpdate}, {"schedule_id", scheduleId}});
                         }
                     } else {
                         qWarning() << "PUT /api/admin/schedules/" << scheduleId << ": 更新排课记录失败 - " << dbErrorUpdate;
                         if (dbErrorUpdate.contains("not found") || dbErrorUpdate.contains("未找到")) {
                             return errorResponse(dbErrorUpdate, QHttpServerResponse::StatusCode::NotFound);
                         }
                         if (dbErrorUpdate.contains("conflict") || dbErrorUpdate.contains("冲突")) {
                             return errorResponse(dbErrorUpdate, QHttpServerResponse::StatusCode::Conflict);
                         }
                         if (dbErrorUpdate.contains("No changes made") || dbErrorUpdate.contains("未做更改")) {
                             // 如果没有更改，仍然尝试获取当前详情返回
                             QString dbErrorGetNoChange;
                             QJsonObject currentScheduleDetails = m_db->getSingleScheduleDetails(scheduleId, dbErrorGetNoChange);
                             if (!currentScheduleDetails.isEmpty()) {
                                 qInfo() << "管理员更新排课记录 ID: " << scheduleId << " - " << dbErrorUpdate; // "No changes made"
                                 return jsonResponse(currentScheduleDetails); // 返回当前对象
                             } else {
                                 return jsonResponse(QJsonObject{{"message", dbErrorUpdate}}); // 仅返回消息
                             }
                         }
                         return errorResponse("更新排课记录失败: " + dbErrorUpdate, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 4. 删除指定排课记录 (DELETE /api/admin/schedules/{scheduleId})
    server.route("/api/admin/schedules/<arg>", QHttpServerRequest::Method::Delete,
                 [&](int scheduleId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: DELETE /api/admin/schedules/" << scheduleId;
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权删除排课记录。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能删除排课记录。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     QString dbError;
                     if (m_db->deleteSchedule(scheduleId, dbError)) {
                         qInfo() << "管理员成功删除排课记录 ID: " << scheduleId;
                         return noContentResponse();
                     } else {
                         qWarning() << "DELETE /api/admin/schedules/" << scheduleId << ": 删除排课记录失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("未找到")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::NotFound);
                         }
                         // 例如："已有学生选课，无法删除"
                         if (dbError.contains("Students are currently enrolled") || dbError.contains("referenced by")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 或 409 Conflict
                         }
                         return errorResponse("删除排课记录失败: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }
                 });


    qInfo() << "管理员-排课管理路由配置完成。";


    qInfo() << "开始配置管理员-请求审批路由...";

    // =============================================
    // 十一、管理员功能 - 请求审批 (Admin Requests)
    // =============================================

    // 1. 获取待审批请求列表 (GET /api/admin/requests/pending)
    server.route("/api/admin/requests/pending", QHttpServerRequest::Method::Get,
                 [&](const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: GET /api/admin/requests/pending";
                     QJsonObject userPayloadFromToken;
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权访问待审批请求列表。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能访问待审批请求列表。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }

                     RequestParser::AdminPendingRequestsParams params(request.query());
                     // params.filterType 可以是 'all', 'schedule_change', 'exam_arrangement', 或空 (默认为 'all')
                     QString filterTypeToUse = params.filterType.isEmpty() ? "all" : params.filterType.toLower();
                     if (filterTypeToUse != "all" && filterTypeToUse != "schedule_change" && filterTypeToUse != "exam_arrangement") {
                         return errorResponse("无效的 'type' 查询参数，可选值为 'all', 'schedule_change', 'exam_arrangement'。", QHttpServerResponse::StatusCode::BadRequest);
                     }


                     QString dbError;
                     QJsonArray pendingRequests = m_db->getPendingRequestsAdmin(filterTypeToUse, dbError);

                     if (!dbError.isEmpty()) {
                         qWarning() << "GET /api/admin/requests/pending: 数据库错误 - " << dbError;
                         return errorResponse("获取待审批请求列表时发生数据库错误: " + dbError, QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     qInfo() << "管理员成功获取待审批请求列表 (FilterType: " << filterTypeToUse << ")，数量：" << pendingRequests.count();
                     return jsonResponse(pendingRequests);
                 });

    // 2. 批准指定请求 (POST /api/admin/requests/{requestId}/approve)
    server.route("/api/admin/requests/<arg>/approve", QHttpServerRequest::Method::Post,
                 [&](int requestId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/requests/" << requestId << "/approve";
                     QJsonObject userPayloadFromToken; // 操作者 (approver)
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权批准请求。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能批准请求。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }
                     int approverUserId = userPayloadFromToken.value("userId").toInt();

                     // 服务端查询 requestType
                     bool requestFoundInDb;
                     QString determinedRequestType = m_db->getRequestTypeById(requestId, requestFoundInDb);

                     if (!requestFoundInDb) {
                         return errorResponse(QString("请求 ID: %1 未找到。").arg(requestId), QHttpServerResponse::StatusCode::NotFound);
                     }
                     if (determinedRequestType.isEmpty() && requestFoundInDb) { // found 为 true 但 type 为空，说明是数据库查询内部错误
                         qWarning() << "POST /api/admin/requests/" << requestId << "/approve: 查询请求类型时发生数据库错误。";
                         return errorResponse("查询请求类型时发生内部错误。", QHttpServerResponse::StatusCode::InternalServerError);
                     }


                     QString dbError;
                     if (m_db->approveRequest(requestId, determinedRequestType, approverUserId, dbError)) {
                         qInfo() << "管理员 (ID: " << approverUserId << ") 成功批准请求 ID: " << requestId << " (类型: " << determinedRequestType << ")";
                         return jsonResponse(QJsonObject{{"success", true}, {"message", dbError.isEmpty() ? "请求已批准" : dbError}});
                     } else {
                         qWarning() << "POST /api/admin/requests/" << requestId << "/approve: 批准请求 (类型: " << determinedRequestType << ") 失败 - " << dbError;
                         // approveRequest 内部会检查 status，如果不是 pending，dbError 会有提示
                         if (dbError.contains("not found") || dbError.contains("不存在") || dbError.contains("不是“待审批”")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 可能是请求状态已改变
                         }
                         if (dbError.contains("conflict") || dbError.contains("冲突")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::Conflict);
                         }
                         return errorResponse("批准请求失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    // 3. 拒绝指定请求 (POST /api/admin/requests/{requestId}/reject)
    server.route("/api/admin/requests/<arg>/reject", QHttpServerRequest::Method::Post,
                 [&](int requestId, const QHttpServerRequest &request) -> QHttpServerResponse {
                     qDebug() << "收到请求: POST /api/admin/requests/" << requestId << "/reject";
                     QJsonObject userPayloadFromToken; // 操作者 (approver)
                     if (!requireAdmin(request, userPayloadFromToken)) {
                         if (userPayloadFromToken.isEmpty()){
                             return errorResponse("未授权拒绝请求。", QHttpServerResponse::StatusCode::Unauthorized);
                         } else {
                             return errorResponse("只有管理员才能拒绝请求。", QHttpServerResponse::StatusCode::Forbidden);
                         }
                     }
                     int approverUserId = userPayloadFromToken.value("userId").toInt();

                     QJsonObject bodyJson;
                     QString parseErrorMsg;
                     if (!RequestParser::parseJsonBody(request, bodyJson, parseErrorMsg)) {
                         return errorResponse("无效的请求体: " + parseErrorMsg, QHttpServerResponse::StatusCode::BadRequest);
                     }

                     if (!bodyJson.contains("reason") || bodyJson.value("reason").toString().isEmpty()) {
                         return errorResponse("请求体中必须包含 'reason' (拒绝原因) 且不能为空。", QHttpServerResponse::StatusCode::BadRequest);
                     }
                     QString reason = bodyJson.value("reason").toString();

                     // 服务端查询 requestType
                     bool requestFoundInDb;
                     QString determinedRequestType = m_db->getRequestTypeById(requestId, requestFoundInDb);

                     if (!requestFoundInDb) {
                         return errorResponse(QString("请求 ID: %1 未找到。").arg(requestId), QHttpServerResponse::StatusCode::NotFound);
                     }
                     if (determinedRequestType.isEmpty() && requestFoundInDb) {
                         qWarning() << "POST /api/admin/requests/" << requestId << "/reject: 查询请求类型时发生数据库错误。";
                         return errorResponse("查询请求类型时发生内部错误。", QHttpServerResponse::StatusCode::InternalServerError);
                     }

                     QString dbError;
                     if (m_db->rejectRequest(requestId, determinedRequestType, approverUserId, reason, dbError)) {
                         qInfo() << "管理员 (ID: " << approverUserId << ") 成功拒绝请求 ID: " << requestId << " (类型: " << determinedRequestType << ")";
                         return jsonResponse(QJsonObject{{"success", true}, {"message", dbError.isEmpty() ? "请求已拒绝" : dbError}});
                     } else {
                         qWarning() << "POST /api/admin/requests/" << requestId << "/reject: 拒绝请求 (类型: " << determinedRequestType << ") 失败 - " << dbError;
                         if (dbError.contains("not found") || dbError.contains("不存在") || dbError.contains("不是“待审批”")) {
                             return errorResponse(dbError, QHttpServerResponse::StatusCode::BadRequest); // 请求状态已改变
                         }
                         return errorResponse("拒绝请求失败: " + dbError, QHttpServerResponse::StatusCode::BadRequest);
                     }
                 });

    qInfo() << "管理员-请求审批路由配置完成。";
    qInfo() << "所有API路由均已配置完毕。";

}
