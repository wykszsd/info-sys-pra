#include "sqlserver.h"

SqlServer::SqlServer(QObject *parent)
    : QObject{parent}
{
    db=QSqlDatabase::addDatabase("QMYSQL");

    db.setHostName("localhost");
    db.setPort(3306);
    db.setDatabaseName("infsys");
    db.setUserName("root");
    db.setPassword("yk2005310...");
    if(!db.open()){

        qDebug()<<"连接失败";
    }
    else {

        qDebug()<<"连接成功";
        _query=new QSqlQuery();
    }

}

SqlServer::~SqlServer()
{   delete _query;
   db.close();
}

bool SqlServer::getYearAndSemesterFromId(int semester_id, int &year, QString &semester_enum_string)
{
    QSqlQuery tempQuery(db); // 使用局部查询对象，避免干扰 _query
    tempQuery.prepare("SELECT academic_year, term_type FROM semester_periods WHERE semester_id = ?");
    tempQuery.addBindValue(semester_id);
    if (tempQuery.exec() && tempQuery.first()) {
        QString academic_year_str = tempQuery.value("academic_year").toString(); // "YYYY-YYYY"
        QString term_type_str = tempQuery.value("term_type").toString(); // "spring" or "fall"

        QStringList years = academic_year_str.split('-');
        if (years.size() == 2) {
            if (term_type_str.toLower() == "spring") {
                year = years[1].toInt(); // 春季学期对应 academic_year 的后一个年份
            } else if (term_type_str.toLower() == "fall") {
                year = years[0].toInt(); // 秋季学期对应 academic_year 的前一个年份
            } else {
                qWarning() << "Invalid term_type found for semester_id:" << semester_id;
                return false;
            }
            semester_enum_string = term_type_str.toLower();
            return true;
        } else {
            qWarning() << "Invalid academic_year format for semester_id:" << semester_id;
            return false;
        }
    }
    qWarning() << "Failed to retrieve year and semester for semester_id:" << semester_id << tempQuery.lastError().text();
    return false;
}

QJsonObject SqlServer::getUserProfile(int user_id)
{
    QJsonObject userProfile;
    _query->prepare("SELECT user_id, username, role, email, phone, created_at FROM users WHERE user_id = ?");
    _query->addBindValue(user_id);

    if (_query->exec() && _query->first()) {
        QSqlRecord userRecord = _query->record();
        for (int i = 0; i < userRecord.count(); ++i) {
            userProfile.insert(userRecord.fieldName(i),QJsonValue::fromVariant( _query->value(i)));
        }

        QString role = _query->value("role").toString();
        if (role == "student") {
            _query->prepare("SELECT student_id, class_name, enrollment_year FROM students WHERE user_id = ?");
            _query->addBindValue(user_id);
            if (_query->exec() && _query->first()) {
                QSqlRecord studentRecord = _query->record();
                for (int i = 0; i < studentRecord.count(); ++i) {
                    userProfile.insert(studentRecord.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
                }
            } else {
                qDebug() << "Failed to get student details for user_id:" << user_id << _query->lastError().text();
            }
        } else if (role == "teacher") {
            _query->prepare("SELECT teacher_id, department, title FROM teachers WHERE user_id = ?");
            _query->addBindValue(user_id);
            if (_query->exec() && _query->first()) {
                QSqlRecord teacherRecord = _query->record();
                for (int i = 0; i < teacherRecord.count(); ++i) {
                    userProfile.insert(teacherRecord.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
                }
            } else {
                qDebug() << "Failed to get teacher details for user_id:" << user_id << _query->lastError().text();
            }
        }
        // admin 角色目前没有扩展表信息
    } else {
        qDebug() << "Failed to get user info for user_id:" << user_id << _query->lastError().text();
    }
    return userProfile;
}




bool SqlServer::Registering(QString username, QString password, QString role, QString &str)
{
    _query->prepare("SELECT user_id FROM users WHERE username = ?;");
    _query->addBindValue(username);
    if(_query->exec()){
        if(_query->first()){
            str="username exists";
            return false;
        }

    }
    else {
        return "error";
    }
    QString hashpassword=PasswordHashing::HashPasswordFixedLength(password);
    if(!db.transaction()) {
        str="err";
        return false;
    }

    _query->prepare("INSERT INTO users (username, password_hash, role, email, phone)"
                    "VALUES (?, ?, ?, ?, ?);");
    _query->addBindValue(username);
    _query->addBindValue(hashpassword);
    _query->addBindValue(role);
    _query->addBindValue(QVariant());
    _query->addBindValue(QVariant());
    if(!_query->exec()){
        str="err";
        return false;

    };
    QVariant idvar=_query->lastInsertId();

    if(role=="student"){
        _query->prepare("INSERT INTO students (student_id, user_id, class_name, enrollment_year)"
                        "VALUES (?, ?, ?, ?);");
        _query->addBindValue(QString("S%1").arg(idvar.toInt()));
          _query->addBindValue(idvar.toInt());
        _query->addBindValue(QVariant());
          _query->addBindValue(QVariant());
        if(!_query->exec()){
              db.rollback();
            str="err";
            return false;
        }
    }else if(role=="teacher"){

        _query->prepare("INSERT INTO teachers (teacher_id, user_id, department, title)"
                        "VALUES (?, ?, ?, ?);");
        _query->addBindValue(QString("T%1").arg(idvar.toInt()));
        _query->addBindValue(idvar.toInt());
        _query->addBindValue(QVariant());
        _query->addBindValue(QVariant());
        if(!_query->exec()){
            db.rollback();
            str="err";
            return false;
        }

    }
    db.commit();
    str="success";
        return true;
}

QJsonArray SqlServer::getUserNotifications(int user_id, const QString &filter)
{
    QJsonArray _arr;
    QString queryString = "SELECT "
                          "n.notification_id, "
                          "n.title, "
                          "n.content, "
                          "n.notify_time, "
                          "n.type, "
                          "n.is_read "
                          "FROM notifications n "
                          "WHERE n.user_id = :user_id ";

    if (filter.toLower() == "unread") {
        queryString += "AND n.is_read = 0 ";
    }
    queryString += "ORDER BY n.notify_time DESC;";

    _query->prepare(queryString);
    _query->bindValue(":user_id", user_id);

    if (_query->exec()) {
        QSqlRecord _re = _query->record();
        while (_query->next()) {
            QJsonObject ob;
            for (int i = 0; i < _re.count(); i++) {
                ob.insert(_re.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            _arr.append(ob);
        }
    } else {
        qDebug() << "Failed to get user notifications:" << _query->lastError().text();
    }
    return _arr;
}

QJsonArray SqlServer::getUserExamSchedule(int user_id, int semester_id)
{
    QJsonArray _arr;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get exam schedule due to invalid semester_id:" << semester_id;
        return _arr; // 返回空数组
    }

    _query->prepare("SELECT "
                    "e.exam_id, "
                    "c.course_code, "
                    "c.course_name, "
                    "e.exam_type, "
                    "e.exam_date, "
                    "cs.start_time AS exam_start_time, "
                    "cs.end_time AS exam_end_time, "
                    "cr.building AS exam_building, "
                    "cr.room_number AS exam_room_number, "
                    "e.duration AS exam_duration_minutes "
                    "FROM students std "
                    "JOIN enrollments en ON std.student_id = en.student_id "
                    "JOIN schedules sch ON en.schedule_id = sch.schedule_id "
                    "JOIN courses c ON sch.course_id = c.course_id " // 课程与排课关联
                    "JOIN exams e ON c.course_id = e.course_id "     // 考试与课程关联
                    "JOIN class_sections cs ON e.section_id = cs.section_id "
                    "JOIN classrooms cr ON e.classroom_id = cr.classroom_id "
                    "WHERE std.user_id = :user_id "
                    "AND en.status = 'enrolled' "
                    "AND c.year = :target_year "           // 按学年筛选
                    "AND c.semester = :target_semester "   // 按学期类型筛选
                    "ORDER BY e.exam_date ASC, cs.start_time ASC;");

    _query->bindValue(":user_id", user_id);
    _query->bindValue(":target_year", target_year);
    _query->bindValue(":target_semester", target_semester_enum);

    if (_query->exec()) {
        QSqlRecord _re = _query->record();
        while (_query->next()) {
            QJsonObject ob;
            for (int i = 0; i < _re.count(); i++) {
                ob.insert(_re.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            _arr.append(ob);
        }
    } else {
        qDebug() << "Failed to get exam schedule:" << _query->lastError().text();
    }
    return _arr;
}





bool SqlServer::Logining(QString username, QString password, QJsonObject &ob,QString &str)
{
    _query->prepare("SELECT "
" user_id,"
"username,"
"password_hash,"
"role,"
"email,"
"phone,"
"created_at "
"FROM "
"users "
"WHERE "
                    "username = ?; ");
    _query->addBindValue(username);
    if(_query->exec()){
        if(_query->first()){

            if(PasswordHashing::VerifyPasswordFixedLength(password,_query->value("password_hash").toString())){
                QSqlRecord _re=_query->record();
                for(int i=0;i<_re.count();i++){
                    if(_re.fieldName(i)=="password_hash") continue;

                  ob.insert(_re.fieldName(i),QJsonValue::fromVariant( _query->value(i)));
                }
                str="success";
                return true;

            }
            else {
                str="password error";
                return false;
            }

        }
        else {
            str="username not exists";
            return false;
        }


    }
    str=_query->lastError().text();
    return false;


}

QJsonArray SqlServer::getUserClassTable(int user_id, int semester_id, int target_week)
{
    QJsonArray _arr;
    int course_target_year;
    QString course_target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, course_target_year, course_target_semester_enum)) {
        qWarning() << "Cannot get class table due to invalid semester_id:" << semester_id;
        return _arr;
    }

    _query->prepare(
        "SELECT "
        "s.schedule_id, c.course_id, c.course_code, c.course_name, "
        "s.week_day, cs.section_id, cs.start_time, cs.end_time, " // 加入了 start_time, end_time
        "cr.building, cr.room_number, "
        "t_user.username AS teacher_name, t.title AS teacher_title "
        "FROM students std "
        "JOIN users u ON std.user_id = u.user_id "
        "JOIN enrollments en ON std.student_id = en.student_id "
        "JOIN schedules s ON en.schedule_id = s.schedule_id "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN teachers t ON s.teacher_id = t.teacher_id "
        "JOIN users t_user ON t.user_id = t_user.user_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id "
        //不再需要JOIN semester_periods，因为我们已经通过semester_id确定了年份和学期类型
        "WHERE std.user_id = :user_id "
        "AND en.status = 'enrolled' "
        "AND c.year = :course_year "
        "AND c.semester = :course_semester "
        "AND SUBSTRING(s.weeks, :target_week, 1) = '1' " // 假设 weeks 是从1开始的周掩码
        "ORDER BY s.week_day ASC, cs.section_id ASC;"
        );

    _query->bindValue(":user_id", user_id);
    _query->bindValue(":course_year", course_target_year);
    _query->bindValue(":course_semester", course_target_semester_enum);
    _query->bindValue(":target_week", target_week); // target_week 是学期内的第几周

    if (_query->exec()) {
        QSqlRecord _re = _query->record();
        while (_query->next()) {
            QJsonObject ob;
            for (int i = 0; i < _re.count(); i++) {
                ob.insert(_re.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            _arr.append(ob);
        }
    } else {
        qDebug() << "Failed to get class table:" << _query->lastError().text();
    }
    return _arr;
}

QJsonArray SqlServer::getEmptyClassroom(QDate start_date, QDate end_date, const QString &building, const QString &room_type, const QList<int> &section_ids, int min_capacity)
{
    QJsonArray result_per_day_array; // 数组的数组，每天一个子数组

    if (section_ids.isEmpty()) {
        qWarning() << "getEmptyClassroom: section_ids list cannot be empty.";
        return result_per_day_array;
    }

    // 构建节次 ID 的占位符字符串，例如: (?, ?, ?)
    QStringList section_placeholders;
    for (int i = 0; i < section_ids.size(); ++i) {
        section_placeholders << "?";
    }
    QString section_in_clause = section_placeholders.join(", ");


    for (QDate current_date = start_date; current_date <= end_date; current_date = current_date.addDays(1)) {
        QJsonArray available_classrooms_for_date;
        QString sql =
            "WITH PotentialClassrooms AS ( "
            "    SELECT cr.classroom_id, cr.building, cr.room_number, cr.capacity, cr.equipment "
            "    FROM classrooms cr "
            "    WHERE (:target_building IS NULL OR cr.building = :target_building) "
            "      AND (:target_equipment_type IS NULL OR cr.equipment = :target_equipment_type) "
            "      AND (:min_capacity <= 0 OR cr.capacity >= :min_capacity) " // 增加容量筛选
            "), "
            "OccupiedClassroomsOnDateAndSections AS ( "
            "    SELECT DISTINCT s.classroom_id "
            "    FROM schedules s "
            "    JOIN courses c ON s.course_id = c.course_id "
            "    JOIN semester_periods sp ON sp.term_type = c.semester " // 用于计算周次
            "        AND c.year = (CASE sp.term_type "
            "                        WHEN 'fall' THEN CAST(SUBSTRING_INDEX(sp.academic_year, '-', 1) AS UNSIGNED) "
            "                        WHEN 'spring' THEN CAST(SUBSTRING_INDEX(sp.academic_year, '-', -1) AS UNSIGNED) "
            "                      END) "
            "    WHERE s.section_id IN (" + section_in_clause + ") " // 使用 IN 子句
                                  "      AND :query_single_date BETWEEN sp.start_date AND sp.end_date "
                                  "      AND s.week_day = ((DAYOFWEEK(:query_single_date) + 5) % 7 + 1) "
                                  "      AND SUBSTRING(s.weeks, (WEEK(:query_single_date, 1) - WEEK(sp.start_date, 1) + 1), 1) = '1' "
                                  "    UNION "
                                  "    SELECT DISTINCT e.classroom_id "
                                  "    FROM exams e "
                                  "    WHERE e.exam_date = :query_single_date "
                                  "      AND e.section_id IN (" + section_in_clause + ") " // 使用 IN 子句
                                  ") "
                                  "SELECT pc.classroom_id, pc.building, pc.room_number, pc.capacity, pc.equipment "
                                  "FROM PotentialClassrooms pc "
                                  "LEFT JOIN OccupiedClassroomsOnDateAndSections ocs ON pc.classroom_id = ocs.classroom_id "
                                  "WHERE ocs.classroom_id IS NULL "
                                  "ORDER BY pc.building, pc.room_number;";

        _query->prepare(sql);

        // 绑定固定参数
        _query->bindValue(":target_building", building.isEmpty() ? QVariant() : building);
        _query->bindValue(":target_equipment_type", room_type.isEmpty() ? QVariant() : room_type);
        _query->bindValue(":min_capacity", min_capacity <= 0 ? QVariant() : min_capacity);
        _query->bindValue(":query_single_date", current_date);

        // 动态绑定 section_ids (因为prepare后不能改变?数量, 所以在prepare前构造sql)
        // 这里我们是在prepare之后，所以要按顺序 addBindValue
        // 注意：Qt的QSqlQuery对于IN子句的多个?占位符，通过多次addBindValue绑定是正确的。
        // 另一种方法是_query->bindValue(placeholderName, QVariantList) 如果驱动支持
        // 但最安全的是按顺序addBindValue，因为我们已将?直接写入SQL字符串
        // int bind_idx = 0; // 用于追踪绑定位置，因为 :placeholder 已被替换
        for (int section_id : section_ids) {
            _query->addBindValue(section_id); // 第一次绑定 s.section_id IN (...)
        }
        for (int section_id : section_ids) {
            _query->addBindValue(section_id); // 第二次绑定 e.section_id IN (...)
        }


        if (_query->exec()) {
            QSqlRecord _re = _query->record();
            while (_query->next()) {
                QJsonObject ob;
                for (int i = 0; i < _re.count(); i++) {
                    ob.insert(_re.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
                }
                available_classrooms_for_date.append(ob);
            }
        } else {
            qDebug() << "Failed to get empty classrooms for date" << current_date.toString("yyyy-MM-dd") << ":" << _query->lastError().text();
            qDebug() << "Executed query:" << _query->lastQuery();
            qDebug() << "Bound values:" << _query->boundValues();
        }
        result_per_day_array.append(QJsonValue(available_classrooms_for_date)); // 将当天空教室数组加入总数组
    }
    return result_per_day_array;
}

bool SqlServer::addTokenToBlacklist(const QString &jti, quint64 userId, QDateTime expiryTime, QString &message)
{
    if (jti.isEmpty()) {
        message = "JTI (JWT ID) cannot be empty for blacklisting.";
        qWarning() << message;
        return false;
    }

    _query->prepare("INSERT INTO revoked_tokens (jti, user_id, expiry_time) VALUES (:jti, :user_id, :expiry_time)");
    _query->bindValue(":jti", jti);
    if (userId > 0) { // user_id 是可选的
        _query->bindValue(":user_id", userId);
    } else {
        _query->bindValue(":user_id", QVariant()); // Bind NULL if userId is not provided or invalid
    }
    _query->bindValue(":expiry_time", expiryTime);

    if (!_query->exec()) {
        // 检查是否是因为 jti 已经存在 (UNIQUE constraint violation)
        if (_query->lastError().nativeErrorCode().contains("1062")) { // MySQL duplicate entry error code
            message = "Token (JTI: " + jti + ") is already blacklisted.";
            // 这种情况通常不视为错误，因为目标（token失效）已经达成
            return true;
        }
        message = "Failed to add token to blacklist: " + _query->lastError().text();
        qWarning() << message;
        return false;
    }

    message = "Token (JTI: " + jti + ") successfully blacklisted.";
    return true;
}

bool SqlServer::isTokenBlacklisted(const QString &jti)
{
    if (jti.isEmpty()) {
        // An empty JTI should probably be treated as invalid,
        // or your token validation logic should handle tokens without JTI.
        qWarning() << "Attempted to check an empty JTI against blacklist.";
        return true; // Safter to assume invalid/blacklisted if JTI is missing where expected.
    }
    _query->prepare("SELECT COUNT(*) FROM revoked_tokens WHERE jti = :jti");
    _query->bindValue(":jti", jti);

    if (_query->exec() && _query->first()) {
        return _query->value(0).toInt() > 0;
    } else {
        qWarning() << "Error checking token blacklist:" << _query->lastError().text();
        // 在发生数据库错误时，保守起见可以认为 token 是有问题的（或拒绝服务）
        return true;
    }
}

QJsonObject SqlServer::getClassroomDetails(int classroomId)
{
    QJsonObject classroomDetails;
    _query->prepare("SELECT classroom_id, building, room_number, capacity, equipment "
                    "FROM classrooms WHERE classroom_id = :id");
    _query->bindValue(":id", classroomId);

    if (_query->exec() && _query->first()) {
        QSqlRecord record = _query->record();
        for (int i = 0; i < record.count(); ++i) {
            classroomDetails.insert(record.fieldName(i), QJsonValue::fromVariant(_query->value(i)));
        }
    } else if (!_query->isActive() || !_query->first()){
        qWarning() << "Failed to get classroom details for classroom_id:" << classroomId << " (Not found or query failed)" << _query->lastError().text();
    }
    return classroomDetails;
}

QJsonObject SqlServer::getSemesterDetails(int semesterId)
{
    QJsonObject semesterDetails;
    _query->prepare("SELECT semester_id, semester_name, start_date, end_date, term_type, academic_year, is_current "
                    "FROM semester_periods WHERE semester_id = :id");
    _query->bindValue(":id", semesterId);

    if (_query->exec() && _query->first()) {
        QSqlRecord record = _query->record();
        for (int i = 0; i < record.count(); ++i) {
            const QVariant val = _query->value(i);
            const QString fieldName = record.fieldName(i);
            // 日期转为 ISO 格式字符串
            if (fieldName == "start_date" || fieldName == "end_date") {
                semesterDetails.insert(fieldName, val.toDate().toString(Qt::ISODate));
            } else {
                semesterDetails.insert(fieldName, QJsonValue::fromVariant(val));
            }
        }
    } else if (!_query->isActive() || !_query->first()){
        qWarning() << "Failed to get semester details for semester_id:" << semesterId << " (Not found or query failed)" << _query->lastError().text();
    }
    return semesterDetails;
}

int SqlServer::cleanupExpiredBlacklistedTokens(QString &message)
{
    _query->prepare("DELETE FROM revoked_tokens WHERE expiry_time < NOW()");
    if (!_query->exec()) {
        message = "Failed to cleanup expired blacklisted tokens: " + _query->lastError().text();
        qWarning() << message;
        return -1; // 表示错误
    }
    int rowsAffected = _query->numRowsAffected();
    message = QString::number(rowsAffected) + " expired blacklisted tokens cleaned up.";
    return rowsAffected;
}

QJsonObject SqlServer::getCurrentSemesterInfo()
{
    QJsonObject semesterInfo;
    _query->prepare("SELECT semester_id, semester_name, start_date, end_date, term_type, academic_year "
                    "FROM semester_periods WHERE is_current = 1 LIMIT 1");
    if (_query->exec() && _query->first()) {
        QSqlRecord record = _query->record();
        for (int i = 0; i < record.count(); ++i) {
            semesterInfo.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
        }
    } else if (!_query->isActive() || !_query->first()){ // Check if query ran but found no current semester
        qDebug() << "No current semester found or query failed:" << _query->lastError().text();
    }
    return semesterInfo;
}

QJsonArray SqlServer::getAllClassSections()
{
    QJsonArray sectionsArray;
    _query->prepare("SELECT section_id, start_time, end_time, period_type, campus FROM class_sections ORDER BY section_id ASC");
    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject section;
            for (int i = 0; i < record.count(); ++i) {
                section.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            sectionsArray.append(section);
        }
    } else {
        qWarning() << "Failed to get all class sections:" << _query->lastError().text();
    }
    return sectionsArray;
}

QJsonArray SqlServer::getCoursesListShort(int semester_id)
{
    QJsonArray coursesArray;
    QString queryString = "SELECT course_id, course_name, course_code FROM courses ";

    int target_year = 0;
    QString target_semester_enum;
    bool useSemesterFilter = false;

    if (semester_id > 0) {
        if (getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
            queryString += "WHERE year = :year AND semester = :semester ";
            useSemesterFilter = true;
        } else {
            qWarning() << "Invalid semester_id for getCoursesListShort, fetching all courses.";
        }
    }
    queryString += "ORDER BY course_name ASC";

    _query->prepare(queryString);
    if (useSemesterFilter) {
        _query->bindValue(":year", target_year);
        _query->bindValue(":semester", target_semester_enum);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject course;
            for (int i = 0; i < record.count(); ++i) {
                course.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            coursesArray.append(course);
        }
    } else {
        qWarning() << "Failed to get short courses list:" << _query->lastError().text();
    }
    return coursesArray;
}

QJsonArray SqlServer::getTeachersListShort()
{
    QJsonArray teachersArray;
    _query->prepare("SELECT t.teacher_id, u.username AS name, t.department, t.title "
                    "FROM teachers t JOIN users u ON t.user_id = u.user_id "
                    "ORDER BY u.username ASC");
    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject teacher;
            for (int i = 0; i < record.count(); ++i) {
                teacher.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            teachersArray.append(teacher);
        }
    } else {
        qWarning() << "Failed to get teachers list:" << _query->lastError().text();
    }
    return teachersArray;
}

QJsonArray SqlServer::getClassroomsListShort()
{
    QJsonArray classroomsArray;
    _query->prepare("SELECT classroom_id, building, room_number, capacity, equipment FROM classrooms ORDER BY building, room_number ASC");
    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject classroom;
            for (int i = 0; i < record.count(); ++i) {
                classroom.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            classroomsArray.append(classroom);
        }
    } else {
        qWarning() << "Failed to get short classrooms list:" << _query->lastError().text();
    }
    return classroomsArray;
}

QStringList SqlServer::getDistinctBuildingNames()
{
    QStringList buildingNames;
    _query->prepare("SELECT DISTINCT building FROM classrooms ORDER BY building ASC");
    if (_query->exec()) {
        while (_query->next()) {
            buildingNames.append(_query->value(0).toString());
        }
    } else {
        qWarning() << "Failed to get distinct building names:" << _query->lastError().text();
    }
    return buildingNames;
}

QJsonObject SqlServer::getSingleScheduleDetails(int scheduleId, QString &error)
{
    QJsonObject scheduleDetail;
    error.clear();

    QString queryString =
        "SELECT s.schedule_id, s.course_id, c.course_code, c.course_name, "
        "s.teacher_id, tu.username AS teacher_name, t.title AS teacher_title, " // 添加了教师职称
        "s.classroom_id, cr.building AS classroom_building, cr.room_number AS classroom_room_number, cr.capacity AS classroom_capacity, cr.equipment AS classroom_equipment, " // 添加了教室详情
        "s.section_id, cs.start_time, cs.end_time, cs.period_type AS section_period_type, " // 添加了节次时段类型
        "s.week_day, s.weeks, "
        "c.year AS course_year, c.semester AS course_semester, c.credit AS course_credit, c.max_capacity AS course_max_capacity, " // 添加了课程更多详情
        "(SELECT COUNT(*) FROM enrollments en WHERE en.schedule_id = s.schedule_id AND en.status = 'enrolled') AS enrolled_count "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN teachers t ON s.teacher_id = t.teacher_id "
        "JOIN users tu ON t.user_id = tu.user_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id "
        "WHERE s.schedule_id = :sid_param";

    _query->prepare(queryString);
    _query->bindValue(":sid_param", scheduleId);

    if (_query->exec()) {
        if (_query->first()) {
            QSqlRecord record = _query->record();
            for (int i = 0; i < record.count(); ++i) {
                const QVariant val = _query->value(i);
                const QString fieldName = record.fieldName(i);

                // 对时间进行格式化
                if (fieldName == "start_time" || fieldName == "end_time") {
                    scheduleDetail.insert(fieldName, val.toTime().toString("HH:mm"));
                } else {
                    scheduleDetail.insert(fieldName, QJsonValue::fromVariant(val));
                }
            }
        } else {
            error = "Schedule with ID " + QString::number(scheduleId) + " not found.";
            qWarning() << error;
        }
    } else {
        error = "Failed to retrieve schedule details: " + _query->lastError().text();
        qWarning() << error;
    }
    return scheduleDetail;
}

QString SqlServer::getRequestTypeById(int request_id, bool &found)
{
    found = false;
    QSqlQuery checkQuery(db); // 使用局部查询对象

    // 1. 检查 schedule_change_requests 表
    checkQuery.prepare("SELECT COUNT(*) FROM schedule_change_requests WHERE request_id = ?");
    checkQuery.addBindValue(request_id);
    if (checkQuery.exec() && checkQuery.first() && checkQuery.value(0).toInt() > 0) {
        found = true;
        return "schedule_change";
    } else if (!checkQuery.isActive()) { // 查询执行失败
        qWarning() << "Error checking schedule_change_requests for request_id" << request_id << ":" << checkQuery.lastError().text();
        return QString(); // 返回空表示查询失败
    }

    // 2. 如果上面没找到，检查 exam_arrangement_requests 表
    checkQuery.prepare("SELECT COUNT(*) FROM exam_arrangement_requests WHERE request_id = ?");
    checkQuery.addBindValue(request_id);
    if (checkQuery.exec() && checkQuery.first() && checkQuery.value(0).toInt() > 0) {
        found = true;
        return "exam_arrangement";
    } else if (!checkQuery.isActive()) { // 查询执行失败
        qWarning() << "Error checking exam_arrangement_requests for request_id" << request_id << ":" << checkQuery.lastError().text();
        return QString(); // 返回空表示查询失败
    }

    // 如果两张表都没找到
    return QString(); // found 仍然是 false
}

bool SqlServer::markNotificationAsRead(int notification_id, int user_id, QString &message)
{
    _query->prepare("UPDATE notifications SET is_read = 1 "
                    "WHERE notification_id = :notification_id AND user_id = :user_id AND is_read = 0");
    _query->bindValue(":notification_id", notification_id);
    _query->bindValue(":user_id", user_id);
    if (!_query->exec()) {
        message = "Database error: " + _query->lastError().text();
        qWarning() << message;
        return false;
    }
    if (_query->numRowsAffected() > 0) {
        message = "Notification marked as read.";
        return true;
    } else {
        // 可能是通知不存在，或不属于该用户，或已读
        QSqlQuery checkQuery(db);
        checkQuery.prepare("SELECT COUNT(*) FROM notifications WHERE notification_id = ? AND user_id = ?");
        checkQuery.addBindValue(notification_id);
        checkQuery.addBindValue(user_id);
        if(checkQuery.exec() && checkQuery.first() && checkQuery.value(0).toInt() > 0) {
            message = "Notification was already read or no change made.";
        } else {
            message = "Notification not found or does not belong to the user.";
        }
        return false; // Or true if "already read" is considered success
    }
}

bool SqlServer::markAllNotificationsAsRead(int user_id, int &markedCount, QString &message)
{
    markedCount = 0;
    _query->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0");
    _query->bindValue(":user_id", user_id);
    if (!_query->exec()) {
        message = "Database error: " + _query->lastError().text();
        qWarning() << message;
        return false;
    }
    markedCount = _query->numRowsAffected();
    message = QString::number(markedCount) + " notifications marked as read.";
    return true;
}

QJsonArray SqlServer::getSelectableCourses(int semester_id, int student_user_id)
{
    QJsonArray selectableCourses;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get selectable courses due to invalid semester_id:" << semester_id;
        return selectableCourses;
    }

    // 获取该学生在当前学期已选的 schedule_id 列表
    QList<int> enrolled_schedule_ids;
    QSqlQuery enrolledQuery(db);
    enrolledQuery.prepare(
        "SELECT s.schedule_id FROM enrollments en "
        "JOIN schedules s ON en.schedule_id = s.schedule_id "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN students std ON en.student_id = std.student_id "
        "WHERE std.user_id = :user_id AND c.year = :year AND c.semester = :semester AND en.status = 'enrolled'"
        );
    enrolledQuery.bindValue(":user_id", student_user_id);
    enrolledQuery.bindValue(":year", target_year);
    enrolledQuery.bindValue(":semester", target_semester_enum);
    if(enrolledQuery.exec()){
        while(enrolledQuery.next()){
            enrolled_schedule_ids.append(enrolledQuery.value(0).toInt());
        }
    } else {
        qWarning() << "Failed to get student's enrolled schedules:" << enrolledQuery.lastError().text();
    }


    // 主查询，获取课程安排，并计算已选人数
    // 注意：这里的 enrolledCount 是针对特定 schedule_id 的，不是 course_id 的总人数
    _query->prepare(
        "SELECT s.schedule_id, c.course_id, c.course_code, c.course_name, c.credit, c.max_capacity, "
        "s.week_day, s.weeks, cs.section_id, cs.start_time, cs.end_time, "
        "cr.building, cr.room_number, "
        "t_user.username AS teacher_name, t.title AS teacher_title, "
        "(SELECT COUNT(*) FROM enrollments en_count WHERE en_count.schedule_id = s.schedule_id AND en_count.status = 'enrolled') AS enrolled_count "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN teachers t ON s.teacher_id = t.teacher_id "
        "JOIN users t_user ON t.user_id = t_user.user_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id "
        "WHERE c.year = :year AND c.semester = :semester "
        // "AND s.schedule_id NOT IN (SELECT en.schedule_id FROM enrollments en JOIN students std ON en.student_id = std.student_id WHERE std.user_id = :student_user_id AND en.status = 'enrolled') " // 排除已选
        "ORDER BY c.course_code ASC, s.schedule_id ASC;"
        );
    _query->bindValue(":year", target_year);
    _query->bindValue(":semester", target_semester_enum);
    // _query->bindValue(":student_user_id", student_user_id); // 用于 NOT IN 子句，如果直接在SQL中排除

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            int current_schedule_id = _query->value("schedule_id").toInt();
            if (enrolled_schedule_ids.contains(current_schedule_id)) { // 在代码中排除已选课程
                continue;
            }

            QJsonObject course;
            for (int i = 0; i < record.count(); ++i) {
                course.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            // 可以附加一个 is_full 字段
            if (course["enrolled_count"].toInt() >= course["max_capacity"].toInt()) {
                course.insert("is_full", true);
            } else {
                course.insert("is_full", false);
            }
            selectableCourses.append(course);
        }
    } else {
        qWarning() << "Failed to get selectable courses:" << _query->lastError().text();
    }
    return selectableCourses;
}

QJsonArray SqlServer::getMyEnrollments(int student_user_id, int semester_id)
{
    QJsonArray enrollmentsArray;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get enrollments due to invalid semester_id:" << semester_id;
        return enrollmentsArray;
    }

    _query->prepare(
        "SELECT en.enrollment_id, en.status, en.enrollment_time, "
        "s.schedule_id, c.course_id, c.course_code, c.course_name, c.credit, "
        "s.week_day, s.weeks, cs.section_id, cs.start_time, cs.end_time, "
        "cr.building, cr.room_number, "
        "t_user.username AS teacher_name, t.title AS teacher_title "
        "FROM enrollments en "
        "JOIN students std ON en.student_id = std.student_id "
        "JOIN schedules s ON en.schedule_id = s.schedule_id "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN teachers t ON s.teacher_id = t.teacher_id "
        "JOIN users t_user ON t.user_id = t_user.user_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id "
        "WHERE std.user_id = :user_id AND c.year = :year AND c.semester = :semester "
        "ORDER BY c.course_code ASC;"
        );
    _query->bindValue(":user_id", student_user_id);
    _query->bindValue(":year", target_year);
    _query->bindValue(":semester", target_semester_enum);

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject enrollment;
            for (int i = 0; i < record.count(); ++i) {
                enrollment.insert(record.fieldName(i),QJsonValue::fromVariant( _query->value(i)));
            }
            enrollmentsArray.append(enrollment);
        }
    } else {
        qWarning() << "Failed to get my enrollments:" << _query->lastError().text();
    }
    return enrollmentsArray;
}

QJsonArray SqlServer::getTaughtSchedulesByTeacher(const QString &teacher_db_id, int semester_id)
{
    QJsonArray schedulesArray;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get taught schedules due to invalid semester_id:" << semester_id;
        return schedulesArray;
    }

    _query->prepare(
        "SELECT s.schedule_id, c.course_id, c.course_code, c.course_name, c.credit, c.max_capacity, "
        "s.week_day, s.weeks, cs.section_id, cs.start_time, cs.end_time, "
        "cr.building, cr.room_number, "
        "(SELECT COUNT(*) FROM enrollments en_count WHERE en_count.schedule_id = s.schedule_id AND en_count.status = 'enrolled') AS enrolled_count "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id "
        "WHERE s.teacher_id = :teacher_id AND c.year = :year AND c.semester = :semester "
        "ORDER BY c.course_code ASC, s.week_day ASC, cs.section_id ASC;"
        );
    _query->bindValue(":teacher_id", teacher_db_id);
    _query->bindValue(":year", target_year);
    _query->bindValue(":semester", target_semester_enum);

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject schedule;
            for (int i = 0; i < record.count(); ++i) {
                schedule.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            schedulesArray.append(schedule);
        }
    } else {
        qWarning() << "Failed to get taught schedules for teacher " << teacher_db_id << ": " << _query->lastError().text();
    }
    return schedulesArray;
}

QJsonArray SqlServer::getTaughtCoursesShortByTeacher(const QString &teacher_db_id, int semester_id)
{
    QJsonArray coursesArray;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get taught courses short due to invalid semester_id:" << semester_id;
        return coursesArray;
    }

    _query->prepare(
        "SELECT DISTINCT c.course_id, c.course_name, c.course_code "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "WHERE s.teacher_id = :teacher_id AND c.year = :year AND c.semester = :semester "
        "ORDER BY c.course_name ASC;"
        );
    _query->bindValue(":teacher_id", teacher_db_id);
    _query->bindValue(":year", target_year);
    _query->bindValue(":semester", target_semester_enum);

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject course;
            for (int i = 0; i < record.count(); ++i) {
                course.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            coursesArray.append(course);
        }
    } else {
        qWarning() << "Failed to get taught courses short for teacher " << teacher_db_id << ": " << _query->lastError().text();
    }
    return coursesArray;
}

int SqlServer::createScheduleChangeRequest(const QString &teacher_db_id, const QJsonObject &payload, QString &message)
{
    _query->prepare(
        "INSERT INTO schedule_change_requests "
        "(original_schedule_id, teacher_id, proposed_section_id, proposed_week_day, proposed_weeks, proposed_classroom_id, reason, status, requested_at) "
        "VALUES (:original_schedule_id, :teacher_id, :proposed_section_id, :proposed_week_day, :proposed_weeks, :proposed_classroom_id, :reason, 'pending', NOW())"
        );
    _query->bindValue(":original_schedule_id", payload["original_schedule_id"].toInt());
    _query->bindValue(":teacher_id", teacher_db_id);
    _query->bindValue(":proposed_section_id", payload["proposed_section_id"].toInt());
    _query->bindValue(":proposed_week_day", payload["proposed_week_day"].toInt());
    _query->bindValue(":proposed_weeks", payload["proposed_weeks"].toString());
    _query->bindValue(":proposed_classroom_id", payload["proposed_classroom_id"].toInt());
    _query->bindValue(":reason", payload["reason"].toString());

    if (!_query->exec()) {
        message = "Failed to create schedule change request: " + _query->lastError().text();
        qWarning() << message;
        return 0;
    }
    message = "Schedule change request created successfully.";
    return _query->lastInsertId().toInt();
}

int SqlServer::createExamArrangementRequest(const QString &teacher_db_id, const QJsonObject &payload, QString &message)
{
    _query->prepare(
        "INSERT INTO exam_arrangement_requests "
        "(course_id, teacher_id, proposed_exam_type, proposed_exam_date, proposed_section_id, proposed_classroom_id, proposed_duration, reason, status, requested_at) "
        "VALUES (:course_id, :teacher_id, :exam_type, :exam_date, :section_id, :classroom_id, :duration, :reason, 'pending', NOW())"
        );
    _query->bindValue(":course_id", payload["courseId"].toInt());
    _query->bindValue(":teacher_id", teacher_db_id);
    _query->bindValue(":exam_type", payload["examType"].toString());
    _query->bindValue(":exam_date", QDate::fromString(payload["examDate"].toString(), Qt::ISODate));
    _query->bindValue(":section_id", payload["sectionId"].toInt());
    _query->bindValue(":classroom_id", payload.contains("classroomId") ? payload["classroomId"].toInt() : QVariant());
    _query->bindValue(":duration", payload["duration"].toInt());
    _query->bindValue(":reason", payload.contains("reason") ? payload["reason"].toString() : QVariant());

    if (!_query->exec()) {
        message = "Failed to create exam arrangement request: " + _query->lastError().text();
        qWarning() << message;
        return 0;
    }
    message = "Exam arrangement request created successfully.";
    return _query->lastInsertId().toInt();
}

QJsonArray SqlServer::getMyRequests(const QString &teacher_db_id)
{
    QJsonArray requestsArray;
    // 查询调课申请
    _query->prepare(
        "SELECT request_id, 'schedule_change' AS request_type, original_schedule_id, "
        "proposed_section_id, proposed_week_day, proposed_weeks, proposed_classroom_id, reason, status, requested_at, processed_at, approver_id "
        "FROM schedule_change_requests "
        "WHERE teacher_id = :teacher_id ORDER BY requested_at DESC"
        );
    _query->bindValue(":teacher_id", teacher_db_id);
    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject req;
            for (int i = 0; i < record.count(); ++i) {
                req.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            requestsArray.append(req);
        }
    } else {
        qWarning() << "Failed to get schedule change requests for teacher " << teacher_db_id << ": " << _query->lastError().text();
    }

    // 如果有考试安排申请表，则类似地查询
    // 假设有 exam_arrangement_requests 表
    _query->prepare(
        "SELECT request_id, 'exam_arrangement' AS request_type, course_id, "
        "proposed_exam_type, proposed_exam_date, proposed_section_id, proposed_classroom_id, proposed_duration, reason, status, requested_at, processed_at, approver_id "
        "FROM exam_arrangement_requests "
        "WHERE teacher_id = :teacher_id ORDER BY requested_at DESC"
        );
    _query->bindValue(":teacher_id", teacher_db_id);
    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject req;
            for (int i = 0; i < record.count(); ++i) {
                req.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
            }
            // 为了与调课申请的字段名统一，可以做一些映射，或者前端分别处理
            requestsArray.append(req);
        }
    } else {
        qWarning() << "Failed to get exam arrangement requests for teacher " << teacher_db_id << ": " << _query->lastError().text();
    }
    // 可以考虑对两个结果集合并后按 requested_at 再次排序，如果前端需要统一列表

    return requestsArray;
}

bool SqlServer::createAssignmentNotification(const QJsonObject &assignmentPayload, int teacher_user_id, QString &message)
{    Q_UNUSED(teacher_user_id)
    int course_id = assignmentPayload["courseId"].toInt();
    QString title = assignmentPayload["title"].toString();
    QString content = assignmentPayload["content"].toString();

    // 1. 获取当前学期信息 (假设作业是针对当前学期的课程)
    QJsonObject currentSemester = getCurrentSemesterInfo();
    if (currentSemester.isEmpty()) {
        message = "No current semester active to determine relevant students.";
        qWarning() << message;
        return false;
    }
    int target_year;
    QString target_semester_enum;
    if(!getYearAndSemesterFromId(currentSemester["semester_id"].toInt(), target_year, target_semester_enum)){
        message = "Could not determine year/semester from current semester id.";
        qWarning() << message;
        return false;
    }

    // 2. 找到所有选了这门课 (特定学期) 并且状态为 'enrolled' 的学生 user_id
    QList<int> student_user_ids;
    QSqlQuery studentQuery(db);
    studentQuery.prepare(
        "SELECT DISTINCT std.user_id "
        "FROM enrollments en "
        "JOIN schedules s ON en.schedule_id = s.schedule_id "
        "JOIN students std ON en.student_id = std.student_id "
        "JOIN courses c ON s.course_id = c.course_id "
        "WHERE s.course_id = :course_id AND c.year = :year AND c.semester = :semester AND en.status = 'enrolled'"
        );
    studentQuery.bindValue(":course_id", course_id);
    studentQuery.bindValue(":year", target_year);
    studentQuery.bindValue(":semester", target_semester_enum);

    if (!studentQuery.exec()) {
        message = "Failed to retrieve students for the course: " + studentQuery.lastError().text();
        qWarning() << message;
        return false;
    }
    while (studentQuery.next()) {
        student_user_ids.append(studentQuery.value(0).toInt());
    }

    if (student_user_ids.isEmpty()) {
        message = "No students found enrolled in this course for the current semester.";
        // This might not be an error, just no one to notify.
        return true;
    }

    // 3. 为每个学生创建通知 (使用事务)
    if (!db.transaction()) {
        message = "Failed to start transaction for notifications.";
        qWarning() << message << db.lastError().text();
        return false;
    }

    bool all_ok = true;
    _query->prepare(
        "INSERT INTO notifications (user_id, title, content, notify_time, type, is_read) "
        "VALUES (?, ?, ?, NOW(), 'assignment', 0)"
        );
    for (int student_user_id : student_user_ids) {
        _query->bindValue(0, student_user_id);
        _query->bindValue(1, title);
        _query->bindValue(2, content);
        if (!_query->exec()) {
            all_ok = false;
            message = "Failed to create notification for user " + QString::number(student_user_id) + ": " + _query->lastError().text();
            qWarning() << message;
            break;
        }
    }

    if (all_ok) {
        if (!db.commit()) {
            message = "Failed to commit transaction for notifications.";
            qWarning() << message << db.lastError().text();
            return false;
        }
        message = "Assignment notification sent to " + QString::number(student_user_ids.size()) + " students.";
        return true;
    } else {
        db.rollback();
        // message has already been set by the failing query
        return false;
    }
}

QJsonObject SqlServer::getCourseDetails(int courseId, QString &errorMsg)
{
    QJsonObject courseDetail;
    _query->prepare("SELECT course_id, course_code, course_name, credit, semester, year, prerequisites, max_capacity "
                    "FROM courses WHERE course_id = :id");
    _query->bindValue(":id", courseId);

    if (_query->exec() && _query->first()) {
        QSqlRecord record = _query->record();
        for (int i = 0; i < record.count(); ++i) {
            const QString fieldName = record.fieldName(i);
            const QVariant value = _query->value(i);

            if (fieldName == "prerequisites") {
                // 假设 prerequisites 在数据库中存储为 JSON 字符串
                // 我们需要将其解析为 QJsonArray 或 QJsonObject (如果它是对象)
                QString prereqStr = value.toString();
                if (!prereqStr.isEmpty()) {
                    QJsonParseError parseError;
                    QJsonDocument doc = QJsonDocument::fromJson(prereqStr.toUtf8(), &parseError);
                    if (parseError.error == QJsonParseError::NoError) {
                        if (doc.isArray()) {
                            courseDetail.insert(fieldName, doc.array());
                        } else if (doc.isObject()) { // 虽然课程先决条件通常是数组
                            courseDetail.insert(fieldName, doc.object());
                        } else { // 例如 "null" 字符串
                            courseDetail.insert(fieldName, QJsonValue::Null);
                        }
                    } else {
                        qWarning() << "getCourseDetails: Failed to parse prerequisites JSON for courseId" << courseId << ":" << parseError.errorString() << "Original string:" << prereqStr;
                        courseDetail.insert(fieldName, QJsonValue::Null); // 或空数组
                    }
                } else {
                    courseDetail.insert(fieldName, QJsonArray()); // 如果为空字符串，视为空数组
                }
            } else {
                courseDetail.insert(fieldName, QJsonValue::fromVariant(value));
            }
        }
    } else {
        if (!_query->isActive() || !_query->first()) { // 查询执行了但没有结果
            errorMsg = "Course with ID " + QString::number(courseId) + " not found.";
        } else { // 查询执行失败
            errorMsg = "Failed to retrieve course details for ID " + QString::number(courseId) + ": " + _query->lastError().text();
        }
        qWarning() << errorMsg;
    }
    return courseDetail;
}

int SqlServer::enrollCourse(const QString &student_db_id, int schedule_id, int semester_id, QString &message)
{
    // --- 1. 验证 Schedule ID 和学期 ---
    int course_max_capacity = 0;
    int current_enrolled_count = 0;
    QString availability_error;
    if (!isScheduleAvailableForEnrollment(schedule_id, semester_id, course_max_capacity, current_enrolled_count, availability_error)) {
        message = availability_error;
        return 0;
    }

    // --- 2. 检查是否已选 ---
    if (hasStudentAlreadyEnrolled(student_db_id, schedule_id)) {
        message = "You have already enrolled in this course schedule (ID: " + QString::number(schedule_id) + ").";
        return 0;
    }

    // --- 3. 检查课程容量 ---
    if (current_enrolled_count >= course_max_capacity) {
        message = "Course schedule (ID: " + QString::number(schedule_id) + ") is full. Max capacity: "
                  + QString::number(course_max_capacity) + ", Enrolled: " + QString::number(current_enrolled_count);
        return 0;
    }

    // --- 4. 检查时间冲突 ---
    QString conflict_details;
    if (checkTimeConflict(student_db_id, schedule_id, semester_id, conflict_details)) {
        message = conflict_details; // 使用从 checkTimeConflict 返回的详细冲突信息
        return 0;
    }

    // --- 5. (可选) 检查先修课程 ---
    // ... (业务逻辑层) ...

    // --- 6. 执行选课 (数据库事务) ---
    if (!db.transaction()) {
        message = "Failed to start database transaction for enrollment.";
        qWarning() << message << db.lastError().text();
        return 0;
    }

    _query->prepare("INSERT INTO enrollments (student_id, schedule_id, enrollment_time, status) "
                    "VALUES (:student_id, :schedule_id, NOW(), 'enrolled')");
    _query->bindValue(":student_id", student_db_id);
    _query->bindValue(":schedule_id", schedule_id);

    if (!_query->exec()) {
        db.rollback();
        message = "Database error during enrollment: " + _query->lastError().text();
        qWarning() << message;
        return 0;
    }

    int new_enrollment_id = _query->lastInsertId().toInt();

    if (!db.commit()) {
        message = "Failed to commit database transaction for enrollment.";
        qWarning() << message << db.lastError().text();
        return 0;
    }

    message = "Enrollment successful. Enrollment ID: " + QString::number(new_enrollment_id);
    return new_enrollment_id;
}

bool SqlServer::isScheduleAvailableForEnrollment(int schedule_id, int semester_id, int &course_max_capacity, int &current_enrolled_count, QString &error_msg)
{
    int target_year;
    QString target_semester_enum;
    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        error_msg = "Invalid semester ID provided for validation.";
        return false;
    }

    QSqlQuery checkQuery(db);
    checkQuery.prepare(
        "SELECT c.max_capacity, "
        "(SELECT COUNT(*) FROM enrollments en_count WHERE en_count.schedule_id = s.schedule_id AND en_count.status = 'enrolled') AS enrolled_count "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "WHERE s.schedule_id = :schedule_id AND c.year = :year AND c.semester = :semester"
        );
    checkQuery.bindValue(":schedule_id", schedule_id);
    checkQuery.bindValue(":year", target_year);
    checkQuery.bindValue(":semester", target_semester_enum);

    if (checkQuery.exec() && checkQuery.first()) {
        course_max_capacity = checkQuery.value("max_capacity").toInt();
        current_enrolled_count = checkQuery.value("enrolled_count").toInt();
        return true; // Schedule exists for this semester
    } else if (!checkQuery.isActive() || !checkQuery.first()) { // Query ran but found no such schedule for this semester
        QString semester_name_for_msg = "Semester ID " + QString::number(semester_id);
        QSqlQuery semNameQuery(db);
        semNameQuery.prepare("SELECT semester_name FROM semester_periods WHERE semester_id = ?");
        semNameQuery.addBindValue(semester_id);
        if(semNameQuery.exec() && semNameQuery.first()){
            semester_name_for_msg = semNameQuery.value(0).toString();
        }

        error_msg = "Selected course schedule (ID: " + QString::number(schedule_id) +
                    ") is not available in the semester '" + semester_name_for_msg + "' or does not exist.";
        qDebug() << error_msg << checkQuery.lastError().text();
    } else {
        error_msg = "Database error validating schedule availability: " + checkQuery.lastError().text();
        qDebug() << error_msg;
    }
    return false;
}

bool SqlServer::hasStudentAlreadyEnrolled(const QString &student_db_id, int schedule_id)
{
    QSqlQuery checkQuery(db);
    checkQuery.prepare("SELECT COUNT(*) FROM enrollments WHERE student_id = :student_id AND schedule_id = :schedule_id AND status = 'enrolled'");
    checkQuery.bindValue(":student_id", student_db_id);
    checkQuery.bindValue(":schedule_id", schedule_id);
    if (checkQuery.exec() && checkQuery.first()) {
        return checkQuery.value(0).toInt() > 0;
    }
    qWarning() << "Error checking existing enrollment: " << checkQuery.lastError().text();
    return true; // 保守起见，如果查询失败，则认为已选，防止重复
}

bool SqlServer::checkTimeConflict(const QString &student_db_id, int new_schedule_id, int semester_id, QString &conflict_message)
{
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        conflict_message = "Time conflict check failed: Invalid semester_id (" + QString::number(semester_id) + ").";
        qWarning() << conflict_message;
        return true; // 无法验证，保守起见认为有冲突
    }

    // 1. 获取新选课程的时间信息 (星期, 节次, 周次掩码, 课程名用于提示)
    QSqlQuery newScheduleQuery(db);
    newScheduleQuery.prepare(
        "SELECT s.week_day, s.section_id, s.weeks, c.course_name "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "WHERE s.schedule_id = :schedule_id AND c.year = :year AND c.semester = :semester"
        );
    newScheduleQuery.bindValue(":schedule_id", new_schedule_id);
    newScheduleQuery.bindValue(":year", target_year);
    newScheduleQuery.bindValue(":semester", target_semester_enum);

    if (!newScheduleQuery.exec() || !newScheduleQuery.first()) {
        conflict_message = "Time conflict check failed: Could not retrieve details for the new course schedule (ID: "
                           + QString::number(new_schedule_id) + ") in the specified semester.";
        qWarning() << conflict_message << newScheduleQuery.lastError().text();
        return true; // 无法验证
    }
    int new_week_day = newScheduleQuery.value("week_day").toInt();
    int new_section_id = newScheduleQuery.value("section_id").toInt();
    QString new_weeks_mask = newScheduleQuery.value("weeks").toString();
    QString new_course_name = newScheduleQuery.value("course_name").toString();


    // 2. 获取学生在该学期已选的所有其他课程的时间信息
    QSqlQuery existingSchedulesQuery(db);
    existingSchedulesQuery.prepare(
        "SELECT s.week_day, s.section_id, s.weeks, c.course_name AS existing_course_name, "
        "cs.start_time, cs.end_time " // 用于更友好的冲突提示
        "FROM enrollments en "
        "JOIN schedules s ON en.schedule_id = s.schedule_id "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id " // 加入节次表获取时间
        "WHERE en.student_id = :student_id AND en.status = 'enrolled' "
        "AND c.year = :year AND c.semester = :semester "
        "AND s.schedule_id != :new_schedule_id" // 排除正在尝试选的这门课本身
        );
    existingSchedulesQuery.bindValue(":student_id", student_db_id);
    existingSchedulesQuery.bindValue(":year", target_year);
    existingSchedulesQuery.bindValue(":semester", target_semester_enum);
    existingSchedulesQuery.bindValue(":new_schedule_id", new_schedule_id);

    if (!existingSchedulesQuery.exec()) {
        conflict_message = "Time conflict check failed: Could not retrieve student's existing schedules.";
        qWarning() << conflict_message << existingSchedulesQuery.lastError().text();
        return true; // 无法验证
    }

    while (existingSchedulesQuery.next()) {
        int existing_week_day = existingSchedulesQuery.value("week_day").toInt();
        int existing_section_id = existingSchedulesQuery.value("section_id").toInt();
        QString existing_weeks_mask = existingSchedulesQuery.value("weeks").toString();
        QString existing_course_name = existingSchedulesQuery.value("existing_course_name").toString();
        QString existing_start_time = existingSchedulesQuery.value("start_time").toTime().toString("HH:mm");
        QString existing_end_time = existingSchedulesQuery.value("end_time").toTime().toString("HH:mm");


        // 检查是否在同一天、同一节次
        if (new_week_day == existing_week_day && new_section_id == existing_section_id) {
            // 进一步检查周次掩码是否有任何一位重叠
            int min_len = qMin(new_weeks_mask.length(), existing_weeks_mask.length());
            for (int i = 0; i < min_len; ++i) {
                if (new_weeks_mask.at(i) == '1' && existing_weeks_mask.at(i) == '1') {
                    // 发现冲突
                    conflict_message = QString("Time conflict: The new course '%1' (Day %2, Section %3) "
                                               "overlaps with your existing course '%4' (Day %2, Section %3, %5-%6) "
                                               "on one or more weeks (e.g., week %7).")
                                           .arg(new_course_name)
                                           .arg(new_week_day)
                                           .arg(new_section_id)
                                           .arg(existing_course_name)
                                           .arg(existing_start_time)
                                           .arg(existing_end_time)
                                           .arg(i + 1); // 周次是从1开始的
                    qDebug() << conflict_message;
                    return true; // 冲突！
                }
            }
        }
    }

    return false; // 没有找到时间冲突
}

bool SqlServer::withdrawCourse(int enrollment_id, const QString &student_db_id, QString &message)
{
    // --- 1. (业务逻辑层) 检查是否在退课时间窗口内 ---
    // 例如: if (QDate::currentDate() > semester.withdrawal_deadline_date) { message = "Withdrawal deadline has passed."; return false; }

    // --- 2. 检查选课记录状态和归属 ---
    QString can_withdraw_error;
    if (!canStudentWithdraw(enrollment_id, student_db_id, can_withdraw_error)) {
        message = can_withdraw_error;
        return false;
    }

    // --- 3. 执行退课 (数据库事务，虽然这里只是单条更新，但保持一致性) ---
    if (!db.transaction()) {
        message = "Failed to start database transaction for withdrawal.";
        qWarning() << message << db.lastError().text();
        return false;
    }

    _query->prepare("UPDATE enrollments SET status = 'withdrawn' "
                    "WHERE enrollment_id = :enrollment_id AND student_id = :student_id AND status = 'enrolled'");
    _query->bindValue(":enrollment_id", enrollment_id);
    _query->bindValue(":student_id", student_db_id); // 双重验证，确保安全

    if (!_query->exec()) {
        db.rollback();
        message = "Database error during withdrawal: " + _query->lastError().text();
        qWarning() << message;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        if (!db.commit()) {
            message = "Failed to commit database transaction for withdrawal.";
            qWarning() << message << db.lastError().text();
            // 尝试回滚，但更新可能已写入
            return false; // 表示存在严重问题
        }
        message = "Withdrawal successful for enrollment ID: " + QString::number(enrollment_id);
        return true;
    } else {
        // 如果 numRowsAffected 是 0，但之前的 canStudentWithdraw 返回 true，
        // 这可能意味着在 canStudentWithdraw 和 UPDATE 之间状态发生了变化（并发问题），
        // 或者 status 不是 'enrolled'（尽管 canStudentWithdraw 应该已经检查了）。
        // 对于简单场景，可以认为操作未成功执行。
        db.rollback(); // 没有行被影响，回滚是安全的
        message = "Withdrawal failed: No rows affected. The course might have been withdrawn concurrently or an issue occurred.";
        qDebug() << "Withdrawal numRowsAffected was 0 for enrollment_id:" << enrollment_id << "student_id:" << student_db_id;
        return false;
    }
}

bool SqlServer::canStudentWithdraw(int enrollment_id, const QString &student_db_id, QString &error_msg)
{
    QSqlQuery checkQuery(db);
    checkQuery.prepare("SELECT status FROM enrollments WHERE enrollment_id = :enrollment_id AND student_id = :student_id");
    checkQuery.bindValue(":enrollment_id", enrollment_id);
    checkQuery.bindValue(":student_id", student_db_id);

    if (checkQuery.exec() && checkQuery.first()) {
        QString current_status = checkQuery.value("status").toString();
        if (current_status == "enrolled") {
            return true;
        } else if (current_status == "withdrawn") {
            error_msg = "Course is already withdrawn.";
            return false;
        } else {
            error_msg = "Enrollment record has an unexpected status: " + current_status;
            return false;
        }
    } else if (!checkQuery.isActive() || !checkQuery.first()){ // Query ran but found no such record for this student
        error_msg = "Enrollment record (ID: " + QString::number(enrollment_id) + ") not found for this student.";
        qDebug() << error_msg << checkQuery.lastError().text();
    } else { // Query failed
        error_msg = "Database error checking enrollment status: " + checkQuery.lastError().text();
        qDebug() << error_msg;
    }
    return false;
}

QJsonArray SqlServer::getTeacherInvigilationSchedule(const QString &teacher_db_id, int semester_id)
{
    QJsonArray _arr;
    int target_year;
    QString target_semester_enum;

    if (!getYearAndSemesterFromId(semester_id, target_year, target_semester_enum)) {
        qWarning() << "Cannot get teacher invigilation schedule due to invalid semester_id:" << semester_id;
        return _arr; // 返回空数组
    }

    // 查询教师在该学期参与监考的所有考试安排
    // 我们需要从 invigilations 表开始，然后 JOIN exams, courses, class_sections, classrooms
    _query->prepare(
        "SELECT "
        "i.invigilation_id, " // 监考记录本身的ID
        "i.role AS invigilation_role, " // 教师在此次监考中的角色 (main/assistant)
        "e.exam_id, "
        "c.course_code, "
        "c.course_name, "
        "e.exam_type, "
        "e.exam_date, "
        "cs.start_time AS exam_start_time, "
        "cs.end_time AS exam_end_time, "
        "cr.building AS exam_building, "
        "cr.room_number AS exam_room_number, "
        "e.duration AS exam_duration_minutes "
        "FROM invigilations i "
        "JOIN exams e ON i.exam_id = e.exam_id "
        "JOIN courses c ON e.course_id = c.course_id "
        "JOIN class_sections cs ON e.section_id = cs.section_id "
        "JOIN classrooms cr ON e.classroom_id = cr.classroom_id "
        "WHERE i.teacher_id = :teacher_id " // 筛选指定教师的监考记录
        "AND c.year = :target_year "        // 按学年筛选 (通过课程关联的学年)
        "AND c.semester = :target_semester " // 按学期类型筛选 (通过课程关联的学期类型)
        "ORDER BY e.exam_date ASC, cs.start_time ASC;"
        );

    _query->bindValue(":teacher_id", teacher_db_id);
    _query->bindValue(":target_year", target_year);
    _query->bindValue(":target_semester", target_semester_enum);

    if (_query->exec()) {
        QSqlRecord _re = _query->record();
        while (_query->next()) {
            QJsonObject ob;
            for (int j = 0; j < _re.count(); ++j) { // 使用新的循环变量 j
                const QVariant val = _query->value(j);
                const QString fieldName = _re.fieldName(j);
                // 对时间进行格式化
                if (fieldName == "exam_start_time" || fieldName == "exam_end_time") {
                    ob.insert(fieldName, val.toTime().toString("HH:mm"));
                } else if (fieldName == "exam_date") {
                    ob.insert(fieldName, val.toDate().toString(Qt::ISODate));
                }
                else {
                    ob.insert(fieldName, QJsonValue::fromVariant(val));
                }
            }
            _arr.append(ob);
        }
    } else {
        qDebug() << "Failed to get teacher invigilation schedule for teacher_id:" << teacher_db_id
                 << " semester_id:" << semester_id << _query->lastError().text();
    }
    return _arr;
}

QJsonObject SqlServer::getSemestersList(int page, int pageSize, const QString &sortField, const QString &sortOrder, QString &error)
{
    QJsonObject result;
    QJsonArray semestersArray;
    int totalCount = 0;

    // 1. 获取总数
    QSqlQuery countQuery(db);
    countQuery.prepare("SELECT COUNT(*) FROM semester_periods");
    if (countQuery.exec() && countQuery.first()) {
        totalCount = countQuery.value(0).toInt();
    } else {
        error = "Failed to retrieve total count of semesters: " + countQuery.lastError().text();
        qWarning() << error;
        result.insert("data", QJsonArray());
        result.insert("totalCount", 0);
        return result;
    }

    // 2. 构建数据查询语句
    QString queryString = "SELECT semester_id, semester_name, start_date, end_date, term_type, academic_year, is_current "
                          "FROM semester_periods ";

    // 排序
    if (!sortField.isEmpty() && (sortField == "semester_name" || sortField == "start_date" || sortField == "academic_year" || sortField == "is_current")) {
        queryString += "ORDER BY " + sortField; // 注意：直接拼接需要确保 sortField 是安全的
        if (!sortOrder.isEmpty() && (sortOrder.toLower() == "asc" || sortOrder.toLower() == "desc")) {
            queryString += " " + sortOrder.toUpper();
        } else {
            queryString += " ASC"; // 默认升序
        }
    } else {
        queryString += "ORDER BY academic_year DESC, term_type ASC"; // 默认排序
    }

    // 分页
    if (page >= 0 && pageSize > 0) {
        queryString += " LIMIT :limit OFFSET :offset";
    }

    _query->prepare(queryString);

    if (page >= 0 && pageSize > 0) {
        _query->bindValue(":limit", pageSize);
        _query->bindValue(":offset", page * pageSize);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject semester;
            for (int i = 0; i < record.count(); ++i) {
                // 日期转为 ISO 格式字符串
                if (record.fieldName(i) == "start_date" || record.fieldName(i) == "end_date") {
                    semester.insert(record.fieldName(i), _query->value(i).toDate().toString(Qt::ISODate));
                } else {
                    semester.insert(record.fieldName(i), QJsonValue::fromVariant( _query->value(i)));
                }
            }
            semestersArray.append(semester);
        }
    } else {
        error = "Failed to retrieve semesters list: " + _query->lastError().text();
        qWarning() << error;
        // 即使查询失败，也返回已获取的总数，但数据为空
    }

    result.insert("data", semestersArray);
    result.insert("totalCount", totalCount);
    return result;
}

int SqlServer::createSemester(const QJsonObject &payload, QString &error)
{
    // 校验 academic_year 和 term_type 组合的唯一性 (数据库层面有 UNIQUE KEY)
        // 校验 start_date < end_date (数据库层面有 CHECK constraint)

        _query->prepare(
            "INSERT INTO semester_periods (semester_name, start_date, end_date, term_type, academic_year, is_current) "
            "VALUES (:name, :start, :end, :term, :academic, 0)" // is_current 默认为 0
            );
    _query->bindValue(":name", payload["semester_name"].toString());
    _query->bindValue(":start", QDate::fromString(payload["start_date"].toString(), Qt::ISODate));
    _query->bindValue(":end", QDate::fromString(payload["end_date"].toString(), Qt::ISODate));
    _query->bindValue(":term", payload["term_type"].toString());
    _query->bindValue(":academic", payload["academic_year"].toString());

    if (!_query->exec()) {
        if (_query->lastError().nativeErrorCode().contains("1062")) { // MySQL duplicate entry for uk_academic_term
            error = "A semester with the same academic year and term type already exists.";
        } else if (_query->lastError().text().contains("CHECK constraint")) { // 检查约束失败
            error = "Start date must be before end date.";
        }
        else {
            error = "Failed to create semester: " + _query->lastError().text();
        }
        qWarning() << error;
        return 0;
    }
    error = "Semester created successfully.";
    return _query->lastInsertId().toInt();
}

bool SqlServer::updateSemester(int semesterId, const QJsonObject &payload, QString &error)
{
    if (payload.isEmpty()) {
        error = "No data provided for update.";
        return false;
    }

    QStringList setClauses;
    QVariantMap bindValues;

    if (payload.contains("semester_name") && payload["semester_name"].isString()) {
        setClauses << "semester_name = :name";
        bindValues[":name"] = payload["semester_name"].toString();
    }
    if (payload.contains("start_date") && payload["start_date"].isString()) {
        setClauses << "start_date = :start";
        bindValues[":start"] = QDate::fromString(payload["start_date"].toString(), Qt::ISODate);
    }
    if (payload.contains("end_date") && payload["end_date"].isString()) {
        setClauses << "end_date = :end";
        bindValues[":end"] = QDate::fromString(payload["end_date"].toString(), Qt::ISODate);
    }
    // 不允许通过此接口直接修改 term_type, academic_year, is_current

    if (setClauses.isEmpty()) {
        error = "No valid fields provided for update.";
        return true; // 或者 false，取决于业务逻辑
    }

    QString queryString = "UPDATE semester_periods SET " + setClauses.join(", ") + " WHERE semester_id = :id";
    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    _query->bindValue(":id", semesterId);

    if (!_query->exec()) {
        if (_query->lastError().text().contains("CHECK constraint")) { // 检查约束失败
            error = "Start date must be before end date if both are updated.";
        } else {
            error = "Failed to update semester: " + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        error = "Semester updated successfully.";
        return true;
    } else {
        // 可能是 semesterId 不存在
        QSqlQuery checkQuery(db);
        checkQuery.prepare("SELECT COUNT(*) FROM semester_periods WHERE semester_id = ?");
        checkQuery.addBindValue(semesterId);
        if (checkQuery.exec() && checkQuery.first() && checkQuery.value(0).toInt() == 0) {
            error = "Semester not found for update.";
        } else if (checkQuery.isActive()) { // ID存在，但没有行被影响（例如提供的值与现有值相同）
            error = "No changes made to the semester (data might be identical).";
            return true; // 视为成功，因为没有错误
        } else {
            error = "Failed to update semester or semester not found. " + checkQuery.lastError().text();
        }
        return false;
    }
}

bool SqlServer::deleteSemester(int semesterId, QString &error)
{
    // 1. 检查学期是否存在以及是否是当前激活学期
    QSqlQuery checkQuery(db);
    checkQuery.prepare("SELECT is_current FROM semester_periods WHERE semester_id = :id");
    checkQuery.bindValue(":id", semesterId);

    if (!checkQuery.exec()) {
        error = "数据库错误：查询学期信息失败。" + checkQuery.lastError().text();
        qWarning() << error;
        return false;
    }
    if (!checkQuery.first()) {
        error = "操作失败：学期 (ID: " + QString::number(semesterId) + ") 不存在。";
        return false;
    }
    if (checkQuery.value("is_current").toBool()) {
        error = "操作失败：无法删除当前激活的学期。请先激活其他学期。";
        return false;
    }

    // 2. 开始事务并执行删除
    // 数据库的外键约束 (如果 courses.semester_id 指向 semester_periods.semester_id 且设置为 ON DELETE RESTRICT)
    // 会自动阻止删除。这里我们依赖这个约束，并在发生错误时给出提示。
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    _query->prepare("DELETE FROM semester_periods WHERE semester_id = :id");
    _query->bindValue(":id", semesterId);

    if (!_query->exec()) {
        db.rollback(); // 回滚事务
        if (_query->lastError().nativeErrorCode().contains("1451")) { // MySQL 外键约束错误代码
            error = "操作失败：无法删除学期 (ID: " + QString::number(semesterId) + ")，因为它仍被其他记录（如课程安排）引用。请先处理这些引用。";
        } else {
            error = "数据库错误：删除学期失败。" + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) { // 确保确实有行被删除
        if (!db.commit()) {
            error = "数据库错误：提交事务失败。" + db.lastError().text();
            qWarning() << error;
            // 尝试回滚，尽管此时可能为时已晚
            db.rollback();
            return false;
        }
        error = "学期 (ID: " + QString::number(semesterId) + ") 删除成功。";
        return true;
    } else {
        // 如果到这里，意味着学期存在（步骤1已检查），但没有行被删除，这不应该发生。
        db.rollback();
        error = "操作失败：删除学期时未影响任何行，可能存在并发问题或未知错误。";
        qWarning() << error << " (学期ID: " << semesterId << ")";
        return false;
    }
}

bool SqlServer::activateSemester(int semesterId, QString &error)
{
    // 检查 semesterId 是否存在
    QSqlQuery checkExists(db);
    checkExists.prepare("SELECT COUNT(*) FROM semester_periods WHERE semester_id = ?");
    checkExists.addBindValue(semesterId);
    if (!checkExists.exec() || !checkExists.first() || checkExists.value(0).toInt() == 0) {
        error = "Semester with ID " + QString::number(semesterId) + " not found.";
        qWarning() << error;
        return false;
    }


    if (!db.transaction()) {
        error = "Failed to start transaction for activating semester.";
        qWarning() << error << db.lastError().text();
        return false;
    }

    bool success = true;

    // 1. 将所有学期的 is_current 设为 0
    _query->prepare("UPDATE semester_periods SET is_current = 0 WHERE is_current = 1");
    if (!_query->exec()) {
        error = "Failed to deactivate current semester(s): " + _query->lastError().text();
        qWarning() << error;
        success = false;
    }

    // 2. 将指定学期的 is_current 设为 1 (只有在步骤1成功时才执行)
    if (success) {
        _query->prepare("UPDATE semester_periods SET is_current = 1 WHERE semester_id = :id");
        _query->bindValue(":id", semesterId);
        if (!_query->exec()) {
            error = "Failed to activate specified semester (ID: " + QString::number(semesterId) + "): " + _query->lastError().text();
            qWarning() << error;
            success = false;
        } else if (_query->numRowsAffected() == 0) {
            // 虽然前面检查过ID存在，但以防万一
            error = "Failed to activate: Semester ID " + QString::number(semesterId) + " not found during update (should not happen).";
            success = false;
        }
    }

    if (success) {
        if (!db.commit()) {
            error = "Failed to commit transaction for activating semester.";
            qWarning() << error << db.lastError().text();
            return false;
        }
        error = "Semester (ID: " + QString::number(semesterId) + ") activated successfully.";
        return true;
    } else {
        db.rollback();
        // error 已经被之前的失败操作设置了
        return false;
    }
}

QJsonObject SqlServer::getClassroomsList(int page, int pageSize, const QString &sortField, const QString &sortOrder, const QJsonObject &filter, QString &error)
{
    QJsonObject result;
    QJsonArray classroomsArray;
    int totalCount = 0;
    QString baseQuery = "FROM classrooms ";
    QString conditions = "WHERE 1=1 "; // Start with a tautology for easy AND appending
    QVariantMap bindValues;

    // --- 构建筛选条件 ---
    if (filter.contains("building_like") && filter["building_like"].isString()) {
        conditions += "AND building LIKE :building_like ";
        bindValues[":building_like"] = "%" + filter["building_like"].toString() + "%";
    }
    if (filter.contains("room_number_like") && filter["room_number_like"].isString()) {
        conditions += "AND room_number LIKE :room_number_like ";
        bindValues[":room_number_like"] = "%" + filter["room_number_like"].toString() + "%";
    }
    if (filter.contains("equipment_eq") && filter["equipment_eq"].isString()) {
        conditions += "AND equipment = :equipment_eq ";
        bindValues[":equipment_eq"] = filter["equipment_eq"].toString();
    }
    if (filter.contains("min_capacity_gte") && filter["min_capacity_gte"].isDouble()) { // isDouble can hold int
        conditions += "AND capacity >= :min_capacity_gte ";
        bindValues[":min_capacity_gte"] = filter["min_capacity_gte"].toInt();
    }
    if (filter.contains("max_capacity_lte") && filter["max_capacity_lte"].isDouble()) {
        conditions += "AND capacity <= :max_capacity_lte ";
        bindValues[":max_capacity_lte"] = filter["max_capacity_lte"].toInt();
    }


    // 1. 获取总数 (带筛选条件)
    QSqlQuery countQuery(db);
    countQuery.prepare("SELECT COUNT(*) " + baseQuery + conditions);
    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        countQuery.bindValue(it.key(), it.value());
    }

    if (countQuery.exec() && countQuery.first()) {
        totalCount = countQuery.value(0).toInt();
    } else {
        error = "Failed to retrieve total count of classrooms: " + countQuery.lastError().text();
        qWarning() << error;
        result.insert("data", QJsonArray());
        result.insert("totalCount", 0);
        return result;
    }

    // 2. 构建数据查询语句
    QString queryString = "SELECT classroom_id, building, room_number, capacity, equipment " + baseQuery + conditions;

    // 排序
    // 安全的排序列名白名单
    QStringList validSortFields = {"classroom_id", "building", "room_number", "capacity", "equipment"};
    QString sField = "building"; // 默认排序字段
    if (!sortField.isEmpty() && validSortFields.contains(sortField.toLower())) {
        sField = sortField.toLower();
    }
    queryString += "ORDER BY " + sField;

    if (!sortOrder.isEmpty() && (sortOrder.toLower() == "asc" || sortOrder.toLower() == "desc")) {
        queryString += " " + sortOrder.toUpper();
    } else {
        queryString += " ASC"; // 默认升序
    }
    if (sField != "building") queryString += ", building ASC"; // 次级排序
    if (sField != "room_number") queryString += ", room_number ASC";


    // 分页
    if (page >= 0 && pageSize > 0) {
        queryString += " LIMIT :limit OFFSET :offset";
    }

    _query->prepare(queryString);

    // 绑定筛选值
    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    // 绑定分页值
    if (page >= 0 && pageSize > 0) {
        _query->bindValue(":limit", pageSize);
        _query->bindValue(":offset", page * pageSize);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject classroom;
            for (int i = 0; i < record.count(); ++i) {
                classroom.insert(record.fieldName(i),QJsonValue::fromVariant( _query->value(i)));
            }
            classroomsArray.append(classroom);
        }
    } else {
        error = "Failed to retrieve classrooms list: " + _query->lastError().text();
        qWarning() << error;
    }

    result.insert("data", classroomsArray);
    result.insert("totalCount", totalCount);
    return result;
}

int SqlServer::createClassroom(const QJsonObject &payload, QString &error)
{
    // 可以在这里添加一些业务逻辑校验，例如 building 和 room_number 组合是否已存在 (虽然数据库可能有唯一约束)
    // 检查 capacity 是否 > 0
    if (payload["capacity"].toInt() <= 0) {
        error = "Capacity must be a positive number.";
        return 0;
    }
    // 检查 equipment 是否是合法的枚举值
    QStringList validEquipments = {"basic", "multimedia", "lab"};
    if (!validEquipments.contains(payload["equipment"].toString().toLower())) {
        error = "Invalid equipment type. Must be one of: " + validEquipments.join(", ");
        return 0;
    }


    _query->prepare(
        "INSERT INTO classrooms (building, room_number, capacity, equipment) "
        "VALUES (:building, :room_number, :capacity, :equipment)"
        );
    _query->bindValue(":building", payload["building"].toString());
    _query->bindValue(":room_number", payload["room_number"].toString());
    _query->bindValue(":capacity", payload["capacity"].toInt());
    _query->bindValue(":equipment", payload["equipment"].toString()); // 数据库 ENUM 会自动处理大小写（通常）

    if (!_query->exec()) {
        // 假设 building + room_number 有唯一约束
        if (_query->lastError().nativeErrorCode().contains("1062")) {
            error = "A classroom with the same building and room number already exists.";
        } else {
            error = "Failed to create classroom: " + _query->lastError().text();
        }
        qWarning() << error;
        return 0;
    }
    error = "Classroom created successfully.";
    return _query->lastInsertId().toInt();
}

bool SqlServer::updateClassroom(int classroomId, const QJsonObject &payload, QString &error)
{
    if (payload.isEmpty()) {
        error = "操作提示：未提供任何用于更新的数据。";
        return true; // 或者 false，取决于业务逻辑是否认为这是个错误
    }

    // 1. 检查教室是否存在
    QSqlQuery checkExistsQuery(db);
    checkExistsQuery.prepare("SELECT COUNT(*) FROM classrooms WHERE classroom_id = :id");
    checkExistsQuery.bindValue(":id", classroomId);
    if (!checkExistsQuery.exec() || !checkExistsQuery.first() || checkExistsQuery.value(0).toInt() == 0) {
        error = "操作失败：教室 (ID: " + QString::number(classroomId) + ") 不存在。";
        return false;
    }

    // 2. 构建 SET 子句和绑定值
    QStringList setClauses;
    QVariantMap bindValues;
    bool hasChanges = false; // 标记是否有实际的字段需要更新

    if (payload.contains("building") && payload["building"].isString()) {
        setClauses << "building = :building";
        bindValues[":building"] = payload["building"].toString();
        hasChanges = true;
    }
    if (payload.contains("room_number") && payload["room_number"].isString()) {
        setClauses << "room_number = :room_number";
        bindValues[":room_number"] = payload["room_number"].toString();
        hasChanges = true;
    }
    if (payload.contains("capacity")) { // 检查存在性，类型在后面判断
        if (payload["capacity"].isDouble() || payload["capacity"].isString()) { // 允许字符串形式的数字
            bool ok;
            int capacity = payload["capacity"].toVariant().toInt(&ok); // 使用toVariant().toInt()更灵活
            if (ok && capacity > 0) {
                setClauses << "capacity = :capacity";
                bindValues[":capacity"] = capacity;
                hasChanges = true;
            } else {
                error = "校验失败：教室容量必须是正整数。";
                return false;
            }
        } else {
            error = "校验失败：教室容量数据类型无效。"; return false;
        }
    }
    if (payload.contains("equipment") && payload["equipment"].isString()) {
        QStringList validEquipments = {"basic", "multimedia", "lab"};
        QString equipment = payload["equipment"].toString().toLower();
        if (!validEquipments.contains(equipment)) {
            error = "校验失败：无效的设备类型。可选值: " + validEquipments.join(", ");
            return false;
        }
        setClauses << "equipment = :equipment";
        bindValues[":equipment"] = equipment;
        hasChanges = true;
    }

    if (!hasChanges) { // 如果 payload 包含的字段都不是有效更新字段
        error = "操作提示：未提供任何有效的字段用于更新。";
        return true; // 或者 false
    }
    if (setClauses.isEmpty()){ // 进一步确保，虽然 hasChanges 应该已经处理了
        error = "操作提示：没有字段被实际更新。";
        return true;
    }


    // 3. 执行更新
    QString queryString = "UPDATE classrooms SET " + setClauses.join(", ") + " WHERE classroom_id = :id_update";
    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    _query->bindValue(":id_update", classroomId);

    if (!_query->exec()) {
        // 假设 building + room_number 有唯一约束
        if (_query->lastError().nativeErrorCode().contains("1062")) {
            error = "操作失败：更新后的教学楼和房间号组合已存在。";
        } else {
            error = "数据库错误：更新教室信息失败。" + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        error = "教室信息更新成功。";
        return true;
    } else {
        // ID 存在 (已在步骤1检查)，但没有行被影响，意味着提交的数据与现有数据完全相同
        error = "操作提示：提交的数据与现有教室信息相同，未做更改。";
        return true; // 这种情况通常不视为错误
    }
}

bool SqlServer::deleteClassroom(int classroomId, QString &error)
{
    // 1. 检查教室是否存在
    QSqlQuery checkExistsQuery(db);
    checkExistsQuery.prepare("SELECT COUNT(*) FROM classrooms WHERE classroom_id = :id");
    checkExistsQuery.bindValue(":id", classroomId);
    if (!checkExistsQuery.exec() || !checkExistsQuery.first() || checkExistsQuery.value(0).toInt() == 0) {
        error = "操作失败：教室 (ID: " + QString::number(classroomId) + ") 不存在。";
        return false;
    }

    // 2. 开始事务并执行删除
    // 数据库的外键约束 (例如 schedules.classroom_id, exams.classroom_id)
    // 如果设置为 ON DELETE RESTRICT，会阻止删除。
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    _query->prepare("DELETE FROM classrooms WHERE classroom_id = :id");
    _query->bindValue(":id", classroomId);

    if (!_query->exec()) {
        db.rollback();
        if (_query->lastError().nativeErrorCode().contains("1451")) { // MySQL 外键约束错误
            error = "操作失败：无法删除教室 (ID: " + QString::number(classroomId) + ")，因为它当前正被课程安排或考试安排使用。";
        } else {
            error = "数据库错误：删除教室失败。" + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        if (!db.commit()) {
            error = "数据库错误：提交事务失败。" + db.lastError().text();
            qWarning() << error;
            db.rollback();
            return false;
        }
        error = "教室 (ID: " + QString::number(classroomId) + ") 删除成功。";
        return true;
    } else {
        // 已在步骤1检查存在性，若到此则异常
        db.rollback();
        error = "操作失败：删除教室时未影响任何行，可能存在并发问题或未知错误。";
        qWarning() << error << " (教室ID: " << classroomId << ")";
        return false;
    }
}

QJsonObject SqlServer::getCoursesListAdmin(int page, int pageSize, const QString &sortField, const QString &sortOrder, const QJsonObject &filter, QString &error)
{
    QJsonObject result;
    QJsonArray coursesArray;
    int totalCount = 0;
    QString baseQuery = "FROM courses ";
    QString conditions = "WHERE 1=1 ";
    QVariantMap bindValues;

    // --- 构建筛选条件 ---
    if (filter.contains("courseName_like") && filter["courseName_like"].isString()) {
        conditions += "AND course_name LIKE :cn_like ";
        bindValues[":cn_like"] = "%" + filter["courseName_like"].toString() + "%";
    }
    if (filter.contains("courseCode_like") && filter["courseCode_like"].isString()) {
        conditions += "AND course_code LIKE :cc_like ";
        bindValues[":cc_like"] = "%" + filter["courseCode_like"].toString() + "%";
    }
    if (filter.contains("semester_eq") && filter["semester_eq"].isString()) {
        conditions += "AND semester = :sem_eq ";
        bindValues[":sem_eq"] = filter["semester_eq"].toString();
    }
    if (filter.contains("year_eq") && filter["year_eq"].isDouble()) { // isDouble for int
        conditions += "AND year = :year_eq ";
        bindValues[":year_eq"] = filter["year_eq"].toInt();
    }
    if (filter.contains("credit_eq") && filter["credit_eq"].isDouble()) {
        conditions += "AND credit = :credit_eq ";
        bindValues[":credit_eq"] = filter["credit_eq"].toInt();
    }

    // 1. 获取总数
    QSqlQuery countQuery(db);
    countQuery.prepare("SELECT COUNT(*) " + baseQuery + conditions);
    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        countQuery.bindValue(it.key(), it.value());
    }

    if (countQuery.exec() && countQuery.first()) {
        totalCount = countQuery.value(0).toInt();
    } else {
        error = "Failed to retrieve total count of courses: " + countQuery.lastError().text();
        qWarning() << error;
        result.insert("data", QJsonArray());
        result.insert("totalCount", 0);
        return result;
    }

    // 2. 构建数据查询语句
    QString queryString = "SELECT course_id, course_code, course_name, credit, semester, year, prerequisites, max_capacity "
                          + baseQuery + conditions;

    // 排序
    QStringList validSortFields = {"course_id", "course_code", "course_name", "credit", "semester", "year", "max_capacity"};
    QString sField = "course_code"; // 默认
    if (!sortField.isEmpty() && validSortFields.contains(sortField.toLower())) {
        sField = sortField.toLower();
    }
    queryString += " ORDER BY " + sField;

    if (!sortOrder.isEmpty() && (sortOrder.toLower() == "asc" || sortOrder.toLower() == "desc")) {
        queryString += " " + sortOrder.toUpper();
    } else {
        queryString += " ASC";
    }
    if (sField != "course_name") queryString += ", course_name ASC";


    // 分页
    if (page >= 0 && pageSize > 0) {
        queryString += " LIMIT :limit OFFSET :offset";
    }

    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    if (page >= 0 && pageSize > 0) {
        _query->bindValue(":limit", pageSize);
        _query->bindValue(":offset", page * pageSize);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject course;
            for (int i = 0; i < record.count(); ++i) {
                // prerequisites 是 JSON 字段，直接获取其字符串值
                if (record.fieldName(i) == "prerequisites") {
                    // QJsonValue::fromVariant(_query->value(i)) might work if driver supports JSON well
                    // Otherwise, treat as string if it's stored as string
                    course.insert(record.fieldName(i), _query->value(i).toString());
                } else {
                    course.insert(record.fieldName(i),QJsonValue::fromVariant( _query->value(i)));
                }
            }
            coursesArray.append(course);
        }
    } else {
        error = "Failed to retrieve courses list: " + _query->lastError().text();
        qWarning() << error;
    }

    result.insert("data", coursesArray);
    result.insert("totalCount", totalCount);
    return result;
}

int SqlServer::createCourse(const QJsonObject &payload, QString &error)
{
    // 校验
    if (payload["credit"].toInt() <= 0) {
        error = "Credit must be a positive number."; return 0;
    }
    if (payload["max_capacity"].toInt() <= 0) {
        error = "Max capacity must be a positive number."; return 0;
    }
    QStringList validSemesters = {"spring", "fall"};
    if (!validSemesters.contains(payload["semester"].toString().toLower())) {
        error = "Invalid semester type. Must be 'spring' or 'fall'."; return 0;
    }
    // 更多校验：年份范围，prerequisites JSON 格式等

    _query->prepare(
        "INSERT INTO courses (course_code, course_name, credit, semester, year, prerequisites, max_capacity) "
        "VALUES (:code, :name, :credit, :semester, :year, :prereq, :capacity)"
        );
    _query->bindValue(":code", payload["course_code"].toString());
    _query->bindValue(":name", payload["course_name"].toString());
    _query->bindValue(":credit", payload["credit"].toInt());
    _query->bindValue(":semester", payload["semester"].toString());
    _query->bindValue(":year", payload["year"].toInt());

    // prerequisites 是 JSON 字段，可以直接绑定 JSON 字符串
    // 如果数据库 JSON 类型支持，QJsonDocument(QJsonArray::fromStringList(prereq_list)).toJson(QJsonDocument::Compact)
    // 或者直接存前端传来的JSON string
    QJsonValue prereqValue = payload.value("prerequisites");
    if (prereqValue.isString()) {
        _query->bindValue(":prereq", prereqValue.toString());
    } else if (prereqValue.isArray()) { // 如果前端传的是数组
        _query->bindValue(":prereq", QJsonDocument(prereqValue.toArray()).toJson(QJsonDocument::Compact));
    } else {
        _query->bindValue(":prereq", QVariant()); // NULL or empty JSON array "[]"
    }

    _query->bindValue(":capacity", payload["max_capacity"].toInt());

    if (!_query->exec()) {
        if (_query->lastError().nativeErrorCode().contains("1062")) { // course_code UNIQUE
            error = "A course with the same course code already exists.";
        } else {
            error = "Failed to create course: " + _query->lastError().text();
        }
        qWarning() << error;
        return 0;
    }
    error = "Course created successfully.";
    return _query->lastInsertId().toInt();
}

bool SqlServer::updateCourse(int courseId, const QJsonObject &payload, QString &error)
{
    if (payload.isEmpty()) {
        error = "No data provided for course update.";
        return false;
    }

    QStringList setClauses;
    QVariantMap bindValues;

    if (payload.contains("course_code") && payload["course_code"].isString()) {
        setClauses << "course_code = :code";
        bindValues[":code"] = payload["course_code"].toString();
    }
    if (payload.contains("course_name") && payload["course_name"].isString()) {
        setClauses << "course_name = :name";
        bindValues[":name"] = payload["course_name"].toString();
    }
    if (payload.contains("credit") && payload["credit"].isDouble()) {
        int credit = payload["credit"].toInt();
        if (credit <= 0) { error = "Credit must be positive."; return false; }
        setClauses << "credit = :credit";
        bindValues[":credit"] = credit;
    }
    if (payload.contains("semester") && payload["semester"].isString()) {
        QStringList validSemesters = {"spring", "fall"};
        if (!validSemesters.contains(payload["semester"].toString().toLower())) {
            error = "Invalid semester type for update."; return false;
        }
        setClauses << "semester = :semester";
        bindValues[":semester"] = payload["semester"].toString();
    }
    if (payload.contains("year") && payload["year"].isDouble()) {
        setClauses << "year = :year";
        bindValues[":year"] = payload["year"].toInt();
    }
    if (payload.contains("prerequisites")) { // Can be string or array
        QJsonValue prereqValue = payload.value("prerequisites");
        setClauses << "prerequisites = :prereq";
        if (prereqValue.isString()) {
            bindValues[":prereq"] = prereqValue.toString();
        } else if (prereqValue.isArray()) {
            bindValues[":prereq"] = QJsonDocument(prereqValue.toArray()).toJson(QJsonDocument::Compact);
        } else { // e.g. null to clear
            bindValues[":prereq"] = QVariant();
        }
    }
    if (payload.contains("max_capacity") && payload["max_capacity"].isDouble()) {
        int capacity = payload["max_capacity"].toInt();
        if (capacity <= 0) { error = "Max capacity must be positive."; return false; }
        setClauses << "max_capacity = :capacity";
        bindValues[":capacity"] = capacity;
    }

    if (setClauses.isEmpty()) {
        error = "No valid fields provided for course update.";
        return true; // Or false
    }

    QString queryString = "UPDATE courses SET " + setClauses.join(", ") + " WHERE course_id = :id";
    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    _query->bindValue(":id", courseId);

    if (!_query->exec()) {
        if (_query->lastError().nativeErrorCode().contains("1062")) { // course_code UNIQUE
            error = "Update failed: A course with the same course code might already exist.";
        } else {
            error = "Failed to update course: " + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        error = "Course updated successfully.";
        return true;
    } else {
        QSqlQuery checkQuery(db);
        checkQuery.prepare("SELECT COUNT(*) FROM courses WHERE course_id = ?");
        checkQuery.addBindValue(courseId);
        if (checkQuery.exec() && checkQuery.first() && checkQuery.value(0).toInt() == 0) {
            error = "Course not found for update (ID: " + QString::number(courseId) + ").";
        } else if (checkQuery.isActive()){
            error = "No changes made to the course (data might be identical).";
            return true;
        } else {
            error = "Failed to update course or course not found. " + checkQuery.lastError().text();
        }
        return false;
    }
}

bool SqlServer::deleteCourse(int courseId, QString &error)
{
    // 1. 检查课程是否存在
    QSqlQuery checkExistsQuery(db);
    checkExistsQuery.prepare("SELECT COUNT(*) FROM courses WHERE course_id = :id");
    checkExistsQuery.bindValue(":id", courseId);
    if (!checkExistsQuery.exec() || !checkExistsQuery.first() || checkExistsQuery.value(0).toInt() == 0) {
        error = "操作失败：课程 (ID: " + QString::number(courseId) + ") 不存在。";
        return false;
    }

    // 2. 开始事务并执行删除
    // 数据库的外键约束 (例如 schedules.course_id, exams.course_id)
    // 如果设置为 ON DELETE RESTRICT，会阻止删除。
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    _query->prepare("DELETE FROM courses WHERE course_id = :id");
    _query->bindValue(":id", courseId);

    if (!_query->exec()) {
        db.rollback();
        if (_query->lastError().nativeErrorCode().contains("1451")) { // MySQL 外键约束错误
            error = "操作失败：无法删除课程 (ID: " + QString::number(courseId) + ")，因为它已被排课或已有考试安排。";
        } else {
            error = "数据库错误：删除课程失败。" + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        if (!db.commit()) {
            error = "数据库错误：提交事务失败。" + db.lastError().text();
            qWarning() << error;
            db.rollback();
            return false;
        }
        error = "课程 (ID: " + QString::number(courseId) + ") 删除成功。";
        return true;
    } else {
        db.rollback();
        error = "操作失败：删除课程时未影响任何行，可能存在并发问题或未知错误。";
        qWarning() << error << " (课程ID: " << courseId << ")";
        return false;
    }
}

QJsonObject SqlServer::getUsersListAdmin(int page, int pageSize, const QString &sortField, const QString &sortOrder, const QJsonObject &filter, QString &error)
{
    QJsonObject result;
    QJsonArray usersArray;
    int totalCount = 0;

    // --- 构建基础查询和条件 ---
    // 由于需要JOIN，我们先构建一个可以用于COUNT和数据获取的FROM + JOIN + WHERE部分
    QString fromClause = "FROM users u ";
    QString conditions = "WHERE 1=1 ";
    QVariantMap bindValues;

    if (filter.contains("role_eq") && filter["role_eq"].isString()) {
        QString roleFilter = filter["role_eq"].toString().toLower();
        if (roleFilter == "student" || roleFilter == "teacher" || roleFilter == "admin") {
            conditions += "AND u.role = :role_eq ";
            bindValues[":role_eq"] = roleFilter;
        }
    }
    if (filter.contains("username_like") && filter["username_like"].isString()) {
        conditions += "AND u.username LIKE :username_like ";
        bindValues[":username_like"] = "%" + filter["username_like"].toString() + "%";
    }
    if (filter.contains("email_like") && filter["email_like"].isString()) {
        conditions += "AND u.email LIKE :email_like ";
        bindValues[":email_like"] = "%" + filter["email_like"].toString() + "%";
    }
    if (filter.contains("phone_like") && filter["phone_like"].isString()) {
        conditions += "AND u.phone LIKE :phone_like ";
        bindValues[":phone_like"] = "%" + filter["phone_like"].toString() + "%";
    }


    // 1. 获取总数
    QSqlQuery countQuery(db);
    countQuery.prepare("SELECT COUNT(u.user_id) " + fromClause + conditions);
    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        countQuery.bindValue(it.key(), it.value());
    }
    if (countQuery.exec() && countQuery.first()) {
        totalCount = countQuery.value(0).toInt();
    } else {
        error = "Failed to retrieve total count of users: " + countQuery.lastError().text();
        qWarning() << error;
        result.insert("data", QJsonArray());
        result.insert("totalCount", 0);
        return result;
    }

    // 2. 构建数据查询语句 (需要LEFT JOIN来包含所有用户，即使他们没有student/teacher记录)
    // 选择需要的字段，避免选择 password_hash
    QString selectClause = "SELECT u.user_id, u.username, u.role, u.email, u.phone, u.created_at, "
                           "s.student_id, s.class_name, s.enrollment_year, "
                           "t.teacher_id, t.department, t.title ";

    fromClause = "FROM users u "
                 "LEFT JOIN students s ON u.user_id = s.user_id AND u.role = 'student' "
                 "LEFT JOIN teachers t ON u.user_id = t.user_id AND u.role = 'teacher' ";

    QString queryString = selectClause + fromClause + conditions;

    // 排序 (基于 users 表的字段)
    QStringList validSortFields = {"user_id", "username", "role", "email", "created_at"};
    QString sField = "user_id"; // 默认
    if (!sortField.isEmpty() && validSortFields.contains(sortField.toLower())) {
        sField = "u." + sortField.toLower(); // 加表前缀
    } else {
        sField = "u.user_id";
    }
    queryString += " ORDER BY " + sField;

    if (!sortOrder.isEmpty() && (sortOrder.toLower() == "asc" || sortOrder.toLower() == "desc")) {
        queryString += " " + sortOrder.toUpper();
    } else {
        queryString += " ASC";
    }

    // 分页
    if (page >= 0 && pageSize > 0) {
        queryString += " LIMIT :limit OFFSET :offset";
    }

    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    if (page >= 0 && pageSize > 0) {
        _query->bindValue(":limit", pageSize);
        _query->bindValue(":offset", page * pageSize);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject userDetail;
            // Users table fields
            userDetail["userId"] = _query->value("user_id").toJsonValue(); // API 风格 userId
            userDetail["username"] = _query->value("username").toJsonValue();
            userDetail["role"] = _query->value("role").toJsonValue();
            userDetail["email"] = _query->value("email").toJsonValue();
            userDetail["phone"] = _query->value("phone").toJsonValue();
            userDetail["created_at"] = _query->value("created_at").toDateTime().toString(Qt::ISODate);

            QString role = _query->value("role").toString();
            if (role == "student") {
                userDetail["studentId"] = _query->value("student_id").toJsonValue();
                userDetail["class_name"] = _query->value("class_name").toJsonValue();
                userDetail["enrollment_year"] = _query->value("enrollment_year").toJsonValue();
            } else if (role == "teacher") {
                userDetail["teacherId"] = _query->value("teacher_id").toJsonValue();
                userDetail["department"] = _query->value("department").toJsonValue();
                userDetail["title"] = _query->value("title").toJsonValue();
            }
            usersArray.append(userDetail);
        }
    } else {
        error = "Failed to retrieve users list: " + _query->lastError().text();
        qWarning() << error;
    }

    result.insert("data", usersArray);
    result.insert("totalCount", totalCount);
    return result;
}

int SqlServer::createUserAdmin(const QJsonObject &payload, QString &error)
{
    QString username = payload["username"].toString();
    QString password = payload["password"].toString(); // 明文密码
    QString role = payload["role"].toString().toLower();
    QString email = payload.value("email").toString();
    QString phone = payload.value("phone").toString();

    if (username.isEmpty() || password.isEmpty() || role.isEmpty()) {
        error = "Username, password, and role are required.";
        return 0;
    }
    if (role != "student" && role != "teacher" && role != "admin") {
        error = "Invalid role specified.";
        return 0;
    }

    // 检查用户名是否已存在
    QSqlQuery checkUserQuery(db);
    checkUserQuery.prepare("SELECT user_id FROM users WHERE username = :username");
    checkUserQuery.bindValue(":username", username);
    if (checkUserQuery.exec() && checkUserQuery.first()) {
        error = "Username '" + username + "' already exists.";
        return 0;
    }

    QString hashedPassword = PasswordHashing::HashPasswordFixedLength(password);
    if (hashedPassword.isEmpty()) {
        error = "Password hashing failed.";
        return 0;
    }

    if (!db.transaction()) {
        error = "Failed to start transaction for user creation.";
        qWarning() << error << db.lastError().text();
        return 0;
    }

    // 1. 插入 users 表
    _query->prepare("INSERT INTO users (username, password_hash, role, email, phone) "
                    "VALUES (:username, :password_hash, :role, :email, :phone)");
    _query->bindValue(":username", username);
    _query->bindValue(":password_hash", hashedPassword);
    _query->bindValue(":role", role);
    _query->bindValue(":email", email.isEmpty() ? QVariant() : email);
    _query->bindValue(":phone", phone.isEmpty() ? QVariant() : phone);

    if (!_query->exec()) {
        db.rollback();
        error = "Failed to insert into users table: " + _query->lastError().text();
        qWarning() << error;
        return 0;
    }
    int new_user_id = _query->lastInsertId().toInt();

    // 2. 如果是学生或教师，插入到对应扩展表
    bool details_ok = true;
    if (role == "student") {
        QString student_db_id = "S" + QString::number(new_user_id); // 学号生成规则
        QString class_name = payload.value("class_name").toString(); // 来自 payload.student_info
        QVariant enrollment_year = payload.contains("enrollment_year") ? payload["enrollment_year"].toInt() : QVariant();

        _query->prepare("INSERT INTO students (student_id, user_id, class_name, enrollment_year) "
                        "VALUES (:student_id, :user_id, :class_name, :enrollment_year)");
        _query->bindValue(":student_id", student_db_id);
        _query->bindValue(":user_id", new_user_id);
        _query->bindValue(":class_name", class_name.isEmpty() ? QVariant() : class_name);
        _query->bindValue(":enrollment_year", enrollment_year);
        if (!_query->exec()) {
            details_ok = false;
            error = "Failed to insert into students table: " + _query->lastError().text();
        }
    } else if (role == "teacher") {
        QString teacher_db_id = "T" + QString::number(new_user_id); // 工号生成规则
        QString department = payload.value("department").toString(); // 来自 payload.teacher_info
        QString title = payload.value("title").toString();

        _query->prepare("INSERT INTO teachers (teacher_id, user_id, department, title) "
                        "VALUES (:teacher_id, :user_id, :department, :title)");
        _query->bindValue(":teacher_id", teacher_db_id);
        _query->bindValue(":user_id", new_user_id);
        _query->bindValue(":department", department.isEmpty() ? QVariant() : department);
        _query->bindValue(":title", title.isEmpty() ? QVariant() : title);
        if (!_query->exec()) {
            details_ok = false;
            error = "Failed to insert into teachers table: " + _query->lastError().text();
        }
    }

    if (!details_ok) {
        db.rollback();
        qWarning() << error; // error 已经被设置
        return 0;
    }

    if (!db.commit()) {
        error = "Failed to commit transaction for user creation.";
        qWarning() << error << db.lastError().text();
        return 0;
    }

    error = "User created successfully with ID: " + QString::number(new_user_id);
    return new_user_id;
}

bool SqlServer::updateUserAdmin(int userId, const QJsonObject &payload, QString &error)
{
    if (payload.isEmpty()) {
        error = "操作提示：未提供任何用于更新的数据。";
        return true; // 或 false
    }

    // 1. 获取用户当前角色和是否存在
    QSqlQuery roleQuery(db);
    roleQuery.prepare("SELECT role FROM users WHERE user_id = :id");
    roleQuery.bindValue(":id", userId);
    QString currentRole;
    if (!roleQuery.exec() || !roleQuery.first()) {
        error = "操作失败：用户 (ID: " + QString::number(userId) + ") 不存在。";
        if(roleQuery.lastError().isValid()) qWarning() << "数据库错误查询用户角色: " << roleQuery.lastError().text();
        return false;
    }
    currentRole = roleQuery.value(0).toString();

    // 2. 开始事务
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    bool mainUserTableUpdated = false;
    bool extensionTableUpdated = false;

    // --- 更新 users 表 ---
    QStringList userSetClauses;
    QVariantMap userBindValues;

    if (payload.contains("email")) { // 允许设置为空字符串
        userSetClauses << "email = :email";
        userBindValues[":email"] = payload["email"].toString(); // toString() on null QJsonValue is ""
    }
    if (payload.contains("phone")) { // 允许设置为空字符串
        userSetClauses << "phone = :phone";
        userBindValues[":phone"] = payload["phone"].toString();
    }
    if (payload.contains("password") && payload["password"].isString() && !payload["password"].toString().isEmpty()) {
        QString newPassword = payload["password"].toString();
        // 可选：在这里添加密码复杂度校验
        QString newHashedPassword = PasswordHashing::HashPasswordFixedLength(newPassword);
        if (newHashedPassword.isEmpty()) {
            db.rollback();
            error = "安全错误：密码哈希失败。";
            return false;
        }
        userSetClauses << "password_hash = :password_hash";
        userBindValues[":password_hash"] = newHashedPassword;
    }

    if (!userSetClauses.isEmpty()) {
        QString userUpdateQueryStr = "UPDATE users SET " + userSetClauses.join(", ") + " WHERE user_id = :id_update_user";
        _query->prepare(userUpdateQueryStr);
        for (auto it = userBindValues.constBegin(); it != userBindValues.constEnd(); ++it) {
            _query->bindValue(it.key(), it.value());
        }
        _query->bindValue(":id_update_user", userId);
        if (!_query->exec()) {
            db.rollback();
            error = "数据库错误：更新用户主表信息失败。" + _query->lastError().text();
            qWarning() << error;
            return false;
        }
        if (_query->numRowsAffected() > 0) mainUserTableUpdated = true;
    }

    // --- 更新学生或教师扩展表 ---
    if (currentRole == "student") {
        QStringList studentSetClauses;
        QVariantMap studentBindValues;
        if (payload.contains("class_name")) { // 允许空字符串
            studentSetClauses << "class_name = :class_name";
            studentBindValues[":class_name"] = payload["class_name"].toString();
        }
        if (payload.contains("enrollment_year")) { // 允许空 (NULL) 或有效年份
            if (payload["enrollment_year"].isNull() || payload["enrollment_year"].toString().isEmpty()){
                studentSetClauses << "enrollment_year = NULL";
            } else if (payload["enrollment_year"].isDouble() || payload["enrollment_year"].isString()){
                bool ok;
                int yearVal = payload["enrollment_year"].toVariant().toInt(&ok);
                if(ok && yearVal > 1900 && yearVal < 2100) { // 简单年份校验
                    studentSetClauses << "enrollment_year = :enrollment_year";
                    studentBindValues[":enrollment_year"] = yearVal;
                } else if (!payload["enrollment_year"].isNull() && !payload["enrollment_year"].toString().isEmpty()){ // 如果不是null也不是空字符串但转换失败
                    db.rollback(); error = "校验失败：无效的入学年份。"; return false;
                }
            } else {
                db.rollback(); error = "校验失败：入学年份数据类型无效。"; return false;
            }
        }
        if (!studentSetClauses.isEmpty()) {
            _query->prepare("UPDATE students SET " + studentSetClauses.join(", ") + " WHERE user_id = :user_id_ext");
            for (auto it = studentBindValues.constBegin(); it != studentBindValues.constEnd(); ++it) {
                _query->bindValue(it.key(), it.value());
            }
            _query->bindValue(":user_id_ext", userId);
            if (!_query->exec()) {
                db.rollback();
                error = "数据库错误：更新学生扩展信息失败。" + _query->lastError().text();
                qWarning() << error;
                return false;
            }
            if (_query->numRowsAffected() > 0) extensionTableUpdated = true;
        }
    } else if (currentRole == "teacher") {
        QStringList teacherSetClauses;
        QVariantMap teacherBindValues;
        if (payload.contains("department")) {
            teacherSetClauses << "department = :department";
            teacherBindValues[":department"] = payload["department"].toString();
        }
        if (payload.contains("title")) {
            teacherSetClauses << "title = :title";
            teacherBindValues[":title"] = payload["title"].toString();
        }
        if (!teacherSetClauses.isEmpty()) {
            _query->prepare("UPDATE teachers SET " + teacherSetClauses.join(", ") + " WHERE user_id = :user_id_ext");
            for (auto it = teacherBindValues.constBegin(); it != teacherBindValues.constEnd(); ++it) {
                _query->bindValue(it.key(), it.value());
            }
            _query->bindValue(":user_id_ext", userId);
            if (!_query->exec()) {
                db.rollback();
                error = "数据库错误：更新教师扩展信息失败。" + _query->lastError().text();
                qWarning() << error;
                return false;
            }
            if (_query->numRowsAffected() > 0) extensionTableUpdated = true;
        }
    }

    if (!mainUserTableUpdated && !extensionTableUpdated && !userSetClauses.isEmpty()) { // 如果有尝试更新users表但没影响行
        // 这意味着users表的数据与提交的一致
    }
    if (!mainUserTableUpdated && !extensionTableUpdated && userSetClauses.isEmpty() &&
        ( (currentRole == "student" && (payload.contains("class_name") || payload.contains("enrollment_year"))) ||
         (currentRole == "teacher" && (payload.contains("department") || payload.contains("title"))) ) )
    {
        // 这意味着只尝试更新扩展表但扩展表数据也一致
    }


    if (!db.commit()) {
        error = "数据库错误：提交事务失败。" + db.lastError().text();
        qWarning() << error;
        // 尝试回滚，虽然提交失败时数据库状态可能已不确定
        db.rollback();
        return false;
    }

    if (mainUserTableUpdated || extensionTableUpdated) {
        error = "用户信息更新成功。";
    } else {
        error = "操作提示：提交的数据与现有用户信息相同，未做更改。";
    }
    return true;
}

bool SqlServer::deleteUserAdmin(int userId, int currentAdminUserId, QString& error)
{
    if (userId == currentAdminUserId) {
        error = "操作失败：管理员不能删除自己的账户。";
        return false;
    }

    // 1. 检查用户是否存在及其角色
    QSqlQuery userQuery(db);
    userQuery.prepare("SELECT username, role FROM users WHERE user_id = :id");
    userQuery.bindValue(":id", userId);
    QString usernameToDelete, roleToDelete;

    if (!userQuery.exec()) {
        error = "数据库错误：查询用户信息失败。" + userQuery.lastError().text();
        qWarning() << error;
        return false;
    }
    if (!userQuery.first()) {
        error = "操作失败：用户 (ID: " + QString::number(userId) + ") 不存在。";
        return false;
    }
    usernameToDelete = userQuery.value("username").toString();
    roleToDelete = userQuery.value("role").toString();

    // 可选：业务规则，例如不能删除特定名称的管理员或最后一个管理员
    // if (roleToDelete == "admin" && ...) { error = "..."; return false; }


    // 2. 开始事务并执行删除
    // students.user_id 和 teachers.user_id 有 ON DELETE CASCADE，会自动删除
    // 其他表如 notifications.user_id, schedules.teacher_id (间接通过 users.user_id),
    // enrollments.student_id (间接) 等，如果其外键设置为 ON DELETE RESTRICT，会阻止删除。
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    _query->prepare("DELETE FROM users WHERE user_id = :id");
    _query->bindValue(":id", userId);

    if (!_query->exec()) {
        db.rollback();
        if (_query->lastError().nativeErrorCode().contains("1451")) { // MySQL 外键约束错误
            error = "操作失败：无法删除用户 (ID: " + QString::number(userId) + ", 用户名: " + usernameToDelete + ")，"
                                                                                                                 "因为该用户仍被其他重要记录（如课程安排、选课记录、通知、各类申请等）引用。请先处理这些关联数据。";
        } else {
            error = "数据库错误：删除用户失败。" + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        if (!db.commit()) {
            error = "数据库错误：提交事务失败。" + db.lastError().text();
            qWarning() << error;
            db.rollback();
            return false;
        }
        error = "用户 (ID: " + QString::number(userId) + ", 用户名: " + usernameToDelete + ") 删除成功。";
        return true;
    } else {
        // 已在步骤1检查过存在性，若到此则异常
        db.rollback();
        error = "操作失败：删除用户时未影响任何行，可能存在并发问题或未知错误。";
        qWarning() << error << " (用户ID: " << userId << ")";
        return false;
    }
}

QJsonObject SqlServer::getSchedulesListAdmin(int page, int pageSize, const QString &sortField, const QString &sortOrder, const QJsonObject &filter, QString &error)
{
    QJsonObject result;
    QJsonArray schedulesArray;
    int totalCount = 0;

    QString baseSelect =
        "SELECT s.schedule_id, s.course_id, c.course_code, c.course_name, "
        "s.teacher_id, tu.username AS teacher_name, "
        "s.classroom_id, cr.building AS classroom_building, cr.room_number AS classroom_room_number, "
        "s.section_id, cs.start_time, cs.end_time, "
        "s.week_day, s.weeks, "
        "c.year AS course_year, c.semester AS course_semester, " // For reference or if semesterId filter needs it
        "(SELECT COUNT(*) FROM enrollments en WHERE en.schedule_id = s.schedule_id AND en.status = 'enrolled') AS enrolled_count ";

    QString fromClause =
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "JOIN teachers t ON s.teacher_id = t.teacher_id "
        "JOIN users tu ON t.user_id = tu.user_id "
        "JOIN classrooms cr ON s.classroom_id = cr.classroom_id "
        "JOIN class_sections cs ON s.section_id = cs.section_id ";

    QString conditions = "WHERE 1=1 ";
    QVariantMap bindValues;

    // --- 构建筛选条件 ---
    if (filter.contains("courseId_eq") && filter["courseId_eq"].isDouble()) {
        conditions += "AND s.course_id = :cid_eq ";
        bindValues[":cid_eq"] = filter["courseId_eq"].toInt();
    }
    if (filter.contains("teacherId_eq") && filter["teacherId_eq"].isString()) { // teacher_id is VARCHAR
        conditions += "AND s.teacher_id = :tid_eq ";
        bindValues[":tid_eq"] = filter["teacherId_eq"].toString();
    }
    if (filter.contains("classroomId_eq") && filter["classroomId_eq"].isDouble()) {
        conditions += "AND s.classroom_id = :crid_eq ";
        bindValues[":crid_eq"] = filter["classroomId_eq"].toInt();
    }
    if (filter.contains("weekDay_eq") && filter["weekDay_eq"].isDouble()) {
        conditions += "AND s.week_day = :wd_eq ";
        bindValues[":wd_eq"] = filter["weekDay_eq"].toInt();
    }
    if (filter.contains("sectionId_eq") && filter["sectionId_eq"].isDouble()) {
        conditions += "AND s.section_id = :sid_eq ";
        bindValues[":sid_eq"] = filter["sectionId_eq"].toInt();
    }

    // 学期筛选 (关键)
    if (filter.contains("semesterId_eq") && filter["semesterId_eq"].isDouble()) {
        int semester_id_filter = filter["semesterId_eq"].toInt();
        int target_year_filter;
        QString target_semester_enum_filter;
        if (getYearAndSemesterFromId(semester_id_filter, target_year_filter, target_semester_enum_filter)) {
            conditions += "AND c.year = :filter_year AND c.semester = :filter_semester ";
            bindValues[":filter_year"] = target_year_filter;
            bindValues[":filter_semester"] = target_semester_enum_filter;
        } else {
            error = "Invalid semesterId in filter, cannot apply semester filter.";
            //可以选择返回空或者忽略此筛选
        }
    } else { // 如果没有提供学期筛选，可能需要一个默认行为，例如只显示当前学期或报错
        // For now, if no semesterId_eq, it shows all schedules across all semesters matching other filters.
        // This might be too much data. Consider making semesterId_eq mandatory.
        error = "Semester ID filter (semesterId_eq) is highly recommended or mandatory for schedule listing.";
        // return result; // Or proceed with caution
    }


    // 1. 获取总数
    QSqlQuery countQuery(db);
    countQuery.prepare("SELECT COUNT(s.schedule_id) " + fromClause + conditions);
    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        countQuery.bindValue(it.key(), it.value());
    }
    if (countQuery.exec() && countQuery.first()) {
        totalCount = countQuery.value(0).toInt();
    } else {
        error += " Failed to retrieve total count of schedules: " + countQuery.lastError().text();
        qWarning() << error;
        result.insert("data", QJsonArray());
        result.insert("totalCount", 0);
        return result;
    }

    // 2. 构建数据查询语句
    QString queryString = baseSelect + fromClause + conditions;

    // 排序
    QStringList validSortFields = {"schedule_id", "course_name", "teacher_name", "classroom_building", "week_day", "start_time"};
    QString sField = "s.schedule_id"; // 默认
    if (!sortField.isEmpty()) {
        if (sortField.toLower() == "course_name") sField = "c.course_name";
        else if (sortField.toLower() == "teacher_name") sField = "tu.username";
        else if (sortField.toLower() == "classroom_building") sField = "cr.building"; // or room_number
        else if (sortField.toLower() == "week_day") sField = "s.week_day";
        else if (sortField.toLower() == "start_time") sField = "cs.start_time"; // requires cs alias
        else if (validSortFields.contains(sortField.toLower())) sField = "s." + sortField.toLower();
    }
    queryString += " ORDER BY " + sField;

    if (!sortOrder.isEmpty() && (sortOrder.toLower() == "asc" || sortOrder.toLower() == "desc")) {
        queryString += " " + sortOrder.toUpper();
    } else {
        queryString += " ASC";
    }
    // Add secondary sort criteria for consistency
    if (sField != "s.week_day") queryString += ", s.week_day ASC";
    if (sField != "cs.start_time") queryString += ", cs.start_time ASC";


    // 分页
    if (page >= 0 && pageSize > 0) {
        queryString += " LIMIT :limit OFFSET :offset";
    }

    _query->prepare(queryString);

    for (auto it = bindValues.constBegin(); it != bindValues.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    if (page >= 0 && pageSize > 0) {
        _query->bindValue(":limit", pageSize);
        _query->bindValue(":offset", page * pageSize);
    }

    if (_query->exec()) {
        QSqlRecord record = _query->record();
        while (_query->next()) {
            QJsonObject schedule;
            for (int i = 0; i < record.count(); ++i) {
                // 时间转为 HH:mm 格式
                if (record.fieldName(i) == "start_time" || record.fieldName(i) == "end_time") {
                    schedule.insert(record.fieldName(i), _query->value(i).toTime().toString("HH:mm"));
                } else {
                    schedule.insert(record.fieldName(i), _query->value(i).toJsonValue());
                }
            }
            schedulesArray.append(schedule);
        }
    } else {
        error += " Failed to retrieve schedules list: " + _query->lastError().text();
        qWarning() << error;
    }

    result.insert("data", schedulesArray);
    result.insert("totalCount", totalCount);
    return result;
}

int SqlServer::createSchedule(const QJsonObject &payload, QString &error)
{
    int course_id = payload["course_id"].toInt();
    QString teacher_id_str = payload["teacher_id"].toString(); // teacher_id is VARCHAR
    int classroom_id = payload["classroom_id"].toInt();
    int section_id = payload["section_id"].toInt();
    int week_day = payload["week_day"].toInt();
    QString weeks = payload["weeks"].toString(); // e.g., "1111000011110000"

    // 校验 week_day, section_id, weeks 格式的有效性
    if (week_day < 1 || week_day > 7) { error = "Invalid week_day (1-7)."; return 0; }
    // section_id 应该在 class_sections 表中存在
    // weeks 字符串长度和格式
    if(weeks.length() > 50 || !weeks.contains(QRegularExpression("^[01]+$"))){ error = "Invalid weeks format (0s and 1s, max 50)."; return 0; }


    // --- 检查排课冲突 ---
    QString conflict_msg;
    if (checkScheduleConflictAdmin(course_id, teacher_id_str, classroom_id, week_day, section_id, weeks, 0, conflict_msg)) {
        error = conflict_msg;
        return 0;
    }

    _query->prepare(
        "INSERT INTO schedules (course_id, teacher_id, classroom_id, section_id, week_day, weeks) "
        "VALUES (:cid, :tid, :crid, :sid, :wd, :w)"
        );
    _query->bindValue(":cid", course_id);
    _query->bindValue(":tid", teacher_id_str);
    _query->bindValue(":crid", classroom_id);
    _query->bindValue(":sid", section_id);
    _query->bindValue(":wd", week_day);
    _query->bindValue(":w", weeks);

    if (!_query->exec()) {
        // 检查是否是由于外键约束失败 (例如 course_id, teacher_id, classroom_id, section_id 不存在)
        if(_query->lastError().nativeErrorCode().contains("1452")){
            error = "Failed to create schedule: Invalid Course ID, Teacher ID, Classroom ID, or Section ID provided.";
        } else {
            error = "Failed to create schedule: " + _query->lastError().text();
        }
        qWarning() << error;
        return 0;
    }
    error = "Schedule created successfully.";
    return _query->lastInsertId().toInt();
}

bool SqlServer::checkScheduleConflictAdmin(int course_id_for_semester_check, const QString& teacher_id_to_check, int classroom_id_to_check,
                                                                      int week_day_to_check, int section_id_to_check, const QString& weeks_mask_to_check,
                                                                      int exclude_schedule_id, QString& conflict_detail )
{
    // 1. 获取用于确定学期的课程信息 (course_id_for_semester_check 的 year 和 semester)
    QSqlQuery courseSemQuery(db);
    courseSemQuery.prepare("SELECT year, semester FROM courses WHERE course_id = :cid");
    courseSemQuery.bindValue(":cid", course_id_for_semester_check);

    if (!courseSemQuery.exec() || !courseSemQuery.first()) {
        conflict_detail = "冲突检查失败：无法获取课程 (ID: " + QString::number(course_id_for_semester_check) + ") 的学期信息。";
        qWarning() << conflict_detail << courseSemQuery.lastError().text();
        return true; // 无法验证，保守认为冲突
    }
    int target_year = courseSemQuery.value("year").toInt();
    QString target_semester_enum = courseSemQuery.value("semester").toString();

    // 2. 查询在同一学期、同一星期、同一节次，且与待检查教师或教室相关的现有排课
    QSqlQuery conflictQuery(db);
    conflictQuery.prepare(
        "SELECT s.schedule_id, c.course_name, s.teacher_id AS existing_teacher_id, s.classroom_id AS existing_classroom_id, s.weeks AS existing_weeks, "
        "tu.username AS existing_teacher_name, cr.building AS existing_building, cr.room_number AS existing_room_number "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id "
        "LEFT JOIN teachers t ON s.teacher_id = t.teacher_id LEFT JOIN users tu ON t.user_id = tu.user_id " // 左连接以防教师信息不完整
        "LEFT JOIN classrooms cr ON s.classroom_id = cr.classroom_id " // 左连接以防教室信息不完整
        "WHERE c.year = :year AND c.semester = :semester "
        "AND s.week_day = :week_day AND s.section_id = :section_id "
        "AND s.schedule_id != :exclude_schedule_id " // 排除自身（用于更新场景）
        "AND (s.teacher_id = :check_teacher_id OR s.classroom_id = :check_classroom_id)" // 核心冲突检查点
        );
    conflictQuery.bindValue(":year", target_year);
    conflictQuery.bindValue(":semester", target_semester_enum);
    conflictQuery.bindValue(":week_day", week_day_to_check);
    conflictQuery.bindValue(":section_id", section_id_to_check);
    conflictQuery.bindValue(":exclude_schedule_id", exclude_schedule_id); // 对于新排课，此值为0或负数
    conflictQuery.bindValue(":check_teacher_id", teacher_id_to_check);
    conflictQuery.bindValue(":check_classroom_id", classroom_id_to_check);

    if (!conflictQuery.exec()) {
        conflict_detail = "数据库错误：执行排课冲突检查失败。" + conflictQuery.lastError().text();
        qWarning() << conflict_detail;
        return true; // 无法确认，保守认为冲突
    }

    while (conflictQuery.next()) {
        QString existing_weeks = conflictQuery.value("existing_weeks").toString();
        int min_len = qMin(weeks_mask_to_check.length(), existing_weeks.length());

        for (int i = 0; i < min_len; ++i) {
            if (weeks_mask_to_check.at(i) == '1' && existing_weeks.at(i) == '1') { // 周次重叠
                QString existing_teacher_id_val = conflictQuery.value("existing_teacher_id").toString();
                int existing_classroom_id_val = conflictQuery.value("existing_classroom_id").toInt();
                QString conflicting_course_name = conflictQuery.value("course_name").toString();
                int conflicting_schedule_id_val = conflictQuery.value("schedule_id").toInt();

                if (existing_teacher_id_val == teacher_id_to_check) {
                    conflict_detail = QString("教师冲突：教师 %1 (ID: %2) 在第 %3 周周%4第%5节已安排课程 '%6' (ID: %7)。")
                                          .arg(conflictQuery.value("existing_teacher_name").toString())
                                          .arg(teacher_id_to_check)
                                          .arg(i + 1)
                                          .arg(week_day_to_check)
                                          .arg(section_id_to_check)
                                          .arg(conflicting_course_name)
                                          .arg(conflicting_schedule_id_val);
                    return true; // 教师冲突
                }

                if (existing_classroom_id_val == classroom_id_to_check) {
                    conflict_detail = QString("教室冲突：教室 %1-%2 (ID: %3) 在第 %4 周周%5第%6节已安排课程 '%7' (ID: %8)。")
                                          .arg(conflictQuery.value("existing_building").toString())
                                          .arg(conflictQuery.value("existing_room_number").toString())
                                          .arg(classroom_id_to_check)
                                          .arg(i + 1)
                                          .arg(week_day_to_check)
                                          .arg(section_id_to_check)
                                          .arg(conflicting_course_name)
                                          .arg(conflicting_schedule_id_val);
                    return true; // 教室冲突
                }
            }
        }
    }
    return false; // 未找到冲突
}

bool SqlServer::updateSchedule(int scheduleId, const QJsonObject &payload, QString &error)
{
    if (payload.isEmpty()) {
        error = "No data provided for schedule update.";
        return false;
    }

    // 1. 获取当前排课记录，用于冲突检查和部分字段的默认值
    QSqlQuery currentScheduleQuery(db);
    currentScheduleQuery.prepare("SELECT course_id, teacher_id, classroom_id, section_id, week_day, weeks FROM schedules WHERE schedule_id = :id");
    currentScheduleQuery.bindValue(":id", scheduleId);
    if (!currentScheduleQuery.exec() || !currentScheduleQuery.first()) {
        error = "Schedule not found (ID: " + QString::number(scheduleId) + ").";
        return false;
    }
    int current_course_id = currentScheduleQuery.value("course_id").toInt();
    QString current_teacher_id = currentScheduleQuery.value("teacher_id").toString();
    int current_classroom_id = currentScheduleQuery.value("classroom_id").toInt();
    int current_section_id = currentScheduleQuery.value("section_id").toInt();
    int current_week_day = currentScheduleQuery.value("week_day").toInt();
    QString current_weeks = currentScheduleQuery.value("weeks").toString();


    // 2. 准备更新的字段和值，如果payload中没有，则使用当前值
    int course_id = payload.value("course_id").toInt(current_course_id); // course_id 通常不应改变，除非业务允许
    QString teacher_id_str = payload.value("teacher_id").toString(current_teacher_id);
    int classroom_id = payload.value("classroom_id").toInt(current_classroom_id);
    int section_id = payload.value("section_id").toInt(current_section_id);
    int week_day = payload.value("week_day").toInt(current_week_day);
    QString weeks = payload.value("weeks").toString(current_weeks);

    // 校验
    if (week_day < 1 || week_day > 7) { error = "Invalid week_day (1-7)."; return false; }
    if(weeks.length() > 50 || !weeks.contains(QRegularExpression("^[01]+$"))){ error = "Invalid weeks format."; return false; }


    // 3. 检查排课冲突 (排除当前 scheduleId 自身)
    // 注意：course_id 用于确定学期，如果 course_id 也变了，要用新的 course_id
    QString conflict_msg;
    if (checkScheduleConflictAdmin(course_id, teacher_id_str, classroom_id, week_day, section_id, weeks, scheduleId, conflict_msg)) {
        error = conflict_msg;
        return false;
    }

    // 4. 构建更新语句
    QStringList setClauses;
    QVariantMap bindValuesUpdate;

    // 只有当 payload 中提供了某个字段时，才加入更新
    if (payload.contains("course_id")) { setClauses << "course_id = :cid"; bindValuesUpdate[":cid"] = course_id; }
    if (payload.contains("teacher_id")) { setClauses << "teacher_id = :tid"; bindValuesUpdate[":tid"] = teacher_id_str; }
    if (payload.contains("classroom_id")) { setClauses << "classroom_id = :crid"; bindValuesUpdate[":crid"] = classroom_id; }
    if (payload.contains("section_id")) { setClauses << "section_id = :sid"; bindValuesUpdate[":sid"] = section_id; }
    if (payload.contains("week_day")) { setClauses << "week_day = :wd"; bindValuesUpdate[":wd"] = week_day; }
    if (payload.contains("weeks")) { setClauses << "weeks = :w"; bindValuesUpdate[":w"] = weeks; }

    if (setClauses.isEmpty()) {
        error = "No valid fields provided for schedule update.";
        return true; // Or false
    }

    QString queryString = "UPDATE schedules SET " + setClauses.join(", ") + " WHERE schedule_id = :id_update";
    _query->prepare(queryString);

    for (auto it = bindValuesUpdate.constBegin(); it != bindValuesUpdate.constEnd(); ++it) {
        _query->bindValue(it.key(), it.value());
    }
    _query->bindValue(":id_update", scheduleId);

    if (!_query->exec()) {
        if(_query->lastError().nativeErrorCode().contains("1452")){
            error = "Update failed: Invalid Course ID, Teacher ID, Classroom ID, or Section ID provided.";
        } else {
            error = "Failed to update schedule: " + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        error = "Schedule updated successfully.";
        return true;
    } else {
        // ID 存在，但没有行被影响（例如提供的值与现有值相同）
        error = "No changes made to the schedule (data might be identical or schedule not found).";
        return true; // 视为成功，因为没有DB错误
    }
}

bool SqlServer::deleteSchedule(int scheduleId, QString &error)
{
    // 1. 检查是否已有学生选此排课 (状态为 enrolled)
    QSqlQuery checkEnrollments(db);
    checkEnrollments.prepare("SELECT COUNT(*) FROM enrollments WHERE schedule_id = :sid AND status = 'enrolled'");
    checkEnrollments.bindValue(":sid", scheduleId);
    if (checkEnrollments.exec() && checkEnrollments.first()) {
        if (checkEnrollments.value(0).toInt() > 0) {
            error = "Cannot delete schedule: Students are currently enrolled in this schedule. Please have them withdraw first or reassign them.";
            return false;
        }
    } else {
        error = "Error checking enrollments for schedule: " + checkEnrollments.lastError().text();
        qWarning() << error;
        return false; // 无法确认，不删除
    }

    // 如果 enrollments 表中 schedule_id 外键设置了 ON DELETE RESTRICT, 上面的检查严格来说不是必须的，
    // 但提供更友好的错误信息比依赖数据库外键错误要好。
    // 如果外键是 ON DELETE CASCADE, 则删除 schedule 会自动删除选课记录，这可能不是期望的行为。

    if (!db.transaction()) {
        error = "Failed to start transaction for schedule deletion.";
        qWarning() << error;
        return false;
    }

    _query->prepare("DELETE FROM schedules WHERE schedule_id = :id");
    _query->bindValue(":id", scheduleId);

    if (!_query->exec()) {
        db.rollback();
        // 外键约束（例如在 schedule_change_requests.original_schedule_id）也可能阻止删除
        if (_query->lastError().nativeErrorCode().contains("1451")) {
            error = "Cannot delete schedule: It is referenced by other records (e.g., change requests, or possibly enrollments if check failed).";
        } else {
            error = "Failed to delete schedule: " + _query->lastError().text();
        }
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        if(!db.commit()){
            error = "Failed to commit transaction for schedule deletion.";
            qWarning() << error;
            return false;
        }
        error = "Schedule deleted successfully.";
        return true;
    } else {
        db.rollback();
        error = "Schedule not found for deletion (ID: " + QString::number(scheduleId) + ").";
        return false;
    }
}

QJsonArray SqlServer::getPendingRequestsAdmin(const QString& filterType, QString& cumulative_error)
{
    QJsonArray requestsArray; // 最终要返回的 QJsonArray
    std::vector<QJsonObject> tempRequestsList; // 用于排序的临时 std::vector

    QString type = filterType.toLower();
    cumulative_error.clear(); // 初始化累积错误信息

    bool fetchScheduleChange = (type == "all" || type == "schedule_change");
    bool fetchExamArrangement = (type == "all" || type == "exam_arrangement");

    // --- 获取待审批的调课申请 ---
    if (fetchScheduleChange) {
        _query->prepare(
            "SELECT scr.request_id, 'schedule_change' AS request_type, scr.requested_at, "
            "scr.teacher_id, tu.username AS teacher_name, "
            "scr.reason, scr.status, "
            "os.schedule_id AS original_schedule_id, oc.course_name AS original_course_name, "
            "os.week_day AS original_week_day, ocs_sec.section_id AS original_section_id, ocs_sec.start_time AS original_start_time, ocs_sec.end_time AS original_end_time, "
            "ocr.building AS original_building, ocr.room_number AS original_room_number, os.weeks AS original_weeks, "
            "scr.proposed_section_id, prop_cs_sec.start_time AS proposed_start_time, prop_cs_sec.end_time AS proposed_end_time, "
            "scr.proposed_week_day, scr.proposed_weeks, "
            "scr.proposed_classroom_id, prop_cr.building AS proposed_building, prop_cr.room_number AS proposed_room_number "
            "FROM schedule_change_requests scr "
            "JOIN teachers t ON scr.teacher_id = t.teacher_id "
            "JOIN users tu ON t.user_id = tu.user_id "
            "JOIN schedules os ON scr.original_schedule_id = os.schedule_id "
            "JOIN courses oc ON os.course_id = oc.course_id "
            "JOIN class_sections ocs_sec ON os.section_id = ocs_sec.section_id "
            "JOIN classrooms ocr ON os.classroom_id = ocr.classroom_id "
            "JOIN class_sections prop_cs_sec ON scr.proposed_section_id = prop_cs_sec.section_id "
            "JOIN classrooms prop_cr ON scr.proposed_classroom_id = prop_cr.classroom_id "
            "WHERE scr.status = 'pending' "
            );

        if (_query->exec()) {
            QSqlRecord record = _query->record();
            while (_query->next()) {
                QJsonObject req;
                for (int i = 0; i < record.count(); ++i) {
                    const QVariant val = _query->value(i);
                    const QString fieldName = record.fieldName(i);
                    if (fieldName == "requested_at" || fieldName == "processed_at") {
                        req.insert(fieldName, val.isNull() ? QJsonValue() : val.toDateTime().toString(Qt::ISODate));
                    } else if (fieldName.endsWith("_start_time") || fieldName.endsWith("_end_time")) {
                        req.insert(fieldName, val.isNull() ? QJsonValue() : val.toTime().toString("HH:mm"));
                    } else {
                        req.insert(fieldName, QJsonValue::fromVariant(val));
                    }
                }
                tempRequestsList.push_back(req); // 添加到临时 vector
            }
        } else {
            QString errMsg = "数据库错误：获取待审批调课申请失败。" + _query->lastError().text();
            cumulative_error += errMsg + "; ";
            qWarning() << errMsg;
        }
    }

    // --- 获取待审批的考试安排申请 ---
    if (fetchExamArrangement) {
        _query->prepare(
            "SELECT ear.request_id, 'exam_arrangement' AS request_type, ear.requested_at, "
            "ear.teacher_id, tu.username AS teacher_name, c.course_id, c.course_name, "
            "ear.proposed_exam_type, ear.proposed_exam_date, ear.proposed_section_id, cs.start_time AS proposed_start_time, cs.end_time AS proposed_end_time, "
            "ear.proposed_classroom_id, cr.building AS proposed_building, cr.room_number AS proposed_room_number, "
            "ear.proposed_duration, ear.reason AS exam_reason, ear.status "
            "FROM exam_arrangement_requests ear "
            "JOIN teachers t ON ear.teacher_id = t.teacher_id "
            "JOIN users tu ON t.user_id = tu.user_id "
            "JOIN courses c ON ear.course_id = c.course_id "
            "JOIN class_sections cs ON ear.proposed_section_id = cs.section_id "
            "LEFT JOIN classrooms cr ON ear.proposed_classroom_id = cr.classroom_id "
            "WHERE ear.status = 'pending' "
            );

        if (_query->exec()) {
            QSqlRecord record = _query->record();
            while (_query->next()) {
                QJsonObject req;
                for (int i = 0; i < record.count(); ++i) {
                    const QVariant val = _query->value(i);
                    const QString fieldName = record.fieldName(i);
                    if (fieldName == "requested_at" || fieldName == "processed_at") {
                        req.insert(fieldName, val.isNull() ? QJsonValue() : val.toDateTime().toString(Qt::ISODate));
                    } else if (fieldName == "proposed_exam_date") {
                        req.insert(fieldName, val.isNull() ? QJsonValue() : val.toDate().toString(Qt::ISODate));
                    } else if (fieldName.endsWith("_start_time") || fieldName.endsWith("_end_time")) {
                        req.insert(fieldName, val.isNull() ? QJsonValue() : val.toTime().toString("HH:mm"));
                    } else {
                        req.insert(fieldName, QJsonValue::fromVariant(val));
                    }
                }
                tempRequestsList.push_back(req); // 添加到临时 vector
            }
        } else {
            QString errMsg = "数据库错误：获取待审批考试安排申请失败。" + _query->lastError().text();
            cumulative_error += errMsg + "; ";
            qWarning() << errMsg;
        }
    }

    // 对合并后的所有请求按 requested_at 升序排序
    if (tempRequestsList.size() > 1) {
        std::sort(tempRequestsList.begin(), tempRequestsList.end(),
                  [](const QJsonObject& a, const QJsonObject& b) -> bool { // lambda 参数类型改为 QJsonObject
                      // 注意：这里假设 a 和 b 都是 QJsonObject，如果不是，需要额外的类型检查和错误处理
                      // 但由于我们是从 QJsonObject 的 vector 排序，这里是安全的

                      QDateTime dtA = QDateTime::fromString(a["requested_at"].toString(), Qt::ISODate);
                      QDateTime dtB = QDateTime::fromString(b["requested_at"].toString(), Qt::ISODate);

                      // 处理无效日期的情况，让无效日期排在有效日期之后
                      if (!dtA.isValid() && dtB.isValid()) return false; // A 无效, B 有效 -> A > B (A排后面)
                      if (dtA.isValid() && !dtB.isValid()) return true;  // A 有效, B 无效 -> A < B (A排前面)
                      if (!dtA.isValid() && !dtB.isValid()) return false; // 两者都无效，保持相对顺序或任意

                      return dtA < dtB;
                  });
    }

    // 将排序后的 QJsonObject 从 vector 复制回 QJsonArray
    for (const QJsonObject& obj : tempRequestsList) {
        requestsArray.append(obj);
    }

    return requestsArray;
}

bool SqlServer::isClassroomFreeForExam(int classroom_id, const QDate &exam_date, int section_id, int exclude_exam_id, QString &detail_msg)
{
    detail_msg.clear();

    // --- 1. 检查常规课程占用 (schedules 表) ---
    // 首先，我们需要确定 exam_date 属于哪个学期，以及是该学期的第几周，星期几。
    QSqlQuery semesterInfoQuery(db);
    semesterInfoQuery.prepare(
        "SELECT semester_id, start_date, end_date, academic_year, term_type "
        "FROM semester_periods "
        "WHERE :exam_date_check BETWEEN start_date AND end_date " // 找到包含考试日期的学期
        "LIMIT 1" // 正常情况下一个日期只应属于一个学期
        );
    semesterInfoQuery.bindValue(":exam_date_check", exam_date);

    if (!semesterInfoQuery.exec() || !semesterInfoQuery.first()) {
        detail_msg = QString("系统错误：无法确定日期 %1 所属的学期信息，无法检查教室占用情况。")
                         .arg(exam_date.toString("yyyy-MM-dd"));
        if(semesterInfoQuery.lastError().isValid()) qWarning() << detail_msg << semesterInfoQuery.lastError().text();
        else qWarning() << detail_msg << " (可能日期未在任何学期范围内)";
        return false; // 无法验证，保守认为不空闲
    }

    QDate semester_start_date = semesterInfoQuery.value("start_date").toDate();
    // MySQL DAYOFWEEK(): 1=Sunday, ..., 7=Saturday. 我们需要 1=Monday, ..., 7=Sunday.
    int week_day_for_schedule = exam_date.dayOfWeek(); // Qt's dayOfWeek: 1=Mon, ..., 7=Sun. 这与我们 schedules.week_day 一致。

    // 计算 exam_date 是学期的第几周 (从1开始)
    // WEEK(date, mode) - WEEK(start_date_of_semester, mode) + 1
    // MySQL WEEK() 函数的 mode 参数很重要。mode 1: Sunday is first day, week 1 contains Jan 1st.
    // 为了简单和跨平台，我们可以直接计算天数差值然后除以7。
    int days_from_semester_start = semester_start_date.daysTo(exam_date);
    if (days_from_semester_start < 0) { // 考试日期在学期开始之前，这不应该发生
        detail_msg = QString("系统错误：考试日期 %1 早于其所属学期 %2 的开始日期 %3。")
                         .arg(exam_date.toString("yyyy-MM-dd"))
                         .arg(semesterInfoQuery.value("semester_name").toString()) // 假设 semester_periods 有 semester_name
                         .arg(semester_start_date.toString("yyyy-MM-dd"));
        qWarning() << detail_msg;
        return false;
    }
    int week_in_semester = (days_from_semester_start / 7) + 1;


    QSqlQuery scheduleConflictQuery(db);
    // 查询语句需要联接 courses 和 semester_periods 以正确匹配学期，
    // 但我们已经通过 exam_date 获取了相关的学期信息，可以直接用 week_in_semester 和 week_day_for_schedule
    scheduleConflictQuery.prepare(
        "SELECT s.schedule_id, c.course_name "
        "FROM schedules s "
        "JOIN courses c ON s.course_id = c.course_id " // 需要通过 course 确定课程的 year 和 semester
        // 使用上面查到的学期信息来过滤 courses
        "WHERE s.classroom_id = :crid AND s.section_id = :sid "
        "AND s.week_day = :wd_schedule "
        "AND SUBSTRING(s.weeks, :week_num_in_semester, 1) = '1' " // 检查周次掩码
        // 确保课程 c 属于包含 exam_date 的那个学期
        "AND c.year = :course_target_year AND c.semester = :course_target_semester_enum "
        );
    scheduleConflictQuery.bindValue(":crid", classroom_id);
    scheduleConflictQuery.bindValue(":sid", section_id);
    scheduleConflictQuery.bindValue(":wd_schedule", week_day_for_schedule);
    scheduleConflictQuery.bindValue(":week_num_in_semester", week_in_semester);

    // 从 semesterInfoQuery 获取课程应匹配的 year 和 semester_enum
    QString academic_year_str = semesterInfoQuery.value("academic_year").toString();
    QString term_type_str = semesterInfoQuery.value("term_type").toString().toLower();
    int course_year_val;
    QStringList years_parts = academic_year_str.split('-');
    if (years_parts.size() == 2) {
        if (term_type_str == "spring") {
            course_year_val = years_parts[1].toInt();
        } else { // fall
            course_year_val = years_parts[0].toInt();
        }
        scheduleConflictQuery.bindValue(":course_target_year", course_year_val);
        scheduleConflictQuery.bindValue(":course_target_semester_enum", term_type_str);
    } else {
        detail_msg = "系统错误：学期 academic_year 格式不正确，无法检查教室占用。";
        qWarning() << detail_msg << academic_year_str;
        return false;
    }


    if (!scheduleConflictQuery.exec()) {
        detail_msg = "数据库错误：检查教室常规课程占用情况失败。" + scheduleConflictQuery.lastError().text();
        qWarning() << detail_msg;
        return false; // 保守处理
    }
    if (scheduleConflictQuery.first()) { // 如果查询到任何匹配的常规课程
        detail_msg = QString("教室 (ID: %1) 在 %2 (第%3周, 周%4) 第 %5 节有常规课程 '%6' (ID: %7) 占用，无法用作考场。")
                         .arg(classroom_id)
                         .arg(exam_date.toString("yyyy-MM-dd"))
                         .arg(week_in_semester)
                         .arg(week_day_for_schedule)
                         .arg(section_id)
                         .arg(scheduleConflictQuery.value("course_name").toString())
                         .arg(scheduleConflictQuery.value("schedule_id").toInt());
        return false;
    }

    // --- 2. 检查其他考试占用 (exams 表) ---
    QSqlQuery examConflictQuery(db);
    examConflictQuery.prepare(
        "SELECT exam_id, c.course_name "
        "FROM exams e JOIN courses c ON e.course_id = c.course_id "
        "WHERE e.classroom_id = :crid_exam AND e.exam_date = :date_exam AND e.section_id = :sid_exam "
        "AND (:exclude_eid_param = 0 OR e.exam_id != :exclude_eid_param)" // 如果 exclude_exam_id 为0或负数，则不排除任何考试
        );
    examConflictQuery.bindValue(":crid_exam", classroom_id);
    examConflictQuery.bindValue(":date_exam", exam_date);
    examConflictQuery.bindValue(":sid_exam", section_id);
    examConflictQuery.bindValue(":exclude_eid_param", exclude_exam_id);


    if (!examConflictQuery.exec()) {
        detail_msg = "数据库错误：检查教室其他考试占用情况失败。" + examConflictQuery.lastError().text();
        qWarning() << detail_msg;
        return false; // 保守处理
    }
    if (examConflictQuery.first()) { // 如果查询到任何其他考试占用
        detail_msg = QString("教室 (ID: %1) 在 %2 第 %3 节已被另一场考试 '%4' (ID: %5) 占用。")
                         .arg(classroom_id)
                         .arg(exam_date.toString("yyyy-MM-dd"))
                         .arg(section_id)
                         .arg(examConflictQuery.value("course_name").toString())
                         .arg(examConflictQuery.value("exam_id").toInt());
        return false;
    }

    // 如果以上检查都通过，则教室在该时间空闲
    return true;
}

bool SqlServer::approveRequest(int requestId, const QString &requestType, int approver_user_id, QString &error)
{
    if (!db.transaction()) {
        error = "数据库错误：启动事务失败。" + db.lastError().text();
        qWarning() << error;
        return false;
    }

    bool overall_success = false; // 用于标记整个操作是否成功

    if (requestType == "schedule_change") {
        // 1. 获取调课申请的详细信息和原课程的 course_id
        QSqlQuery reqQuery(db);
        reqQuery.prepare(
            "SELECT scr.original_schedule_id, s.course_id AS original_course_id, scr.teacher_id, "
            "scr.proposed_section_id, scr.proposed_week_day, scr.proposed_weeks, scr.proposed_classroom_id, scr.status "
            "FROM schedule_change_requests scr "
            "JOIN schedules s ON scr.original_schedule_id = s.schedule_id " // 通过原排课ID获取课程ID
            "WHERE scr.request_id = :id"
            );
        reqQuery.bindValue(":id", requestId);

        if (!reqQuery.exec()) {
            db.rollback();
            error = "数据库错误：查询调课申请信息失败。" + reqQuery.lastError().text();
            qWarning() << error;
            return false;
        }
        if (!reqQuery.first()) {
            db.rollback();
            error = "操作失败：调课申请 (ID: " + QString::number(requestId) + ") 不存在或无法获取原课程信息。";
            return false;
        }
        if (reqQuery.value("status").toString() != "pending") {
            db.rollback();
            error = "操作失败：该调课申请 (ID: " + QString::number(requestId) + ") 当前状态不是“待审批”。";
            return false;
        }

        int original_schedule_id = reqQuery.value("original_schedule_id").toInt();
        int course_id_for_conflict_check = reqQuery.value("original_course_id").toInt(); // 用于确定学期
        QString teacher_id_val = reqQuery.value("teacher_id").toString(); // 这是申请调课的老师，也是原课程的老师
        int proposed_section_id_val = reqQuery.value("proposed_section_id").toInt();
        int proposed_week_day_val = reqQuery.value("proposed_week_day").toInt();
        QString proposed_weeks_val = reqQuery.value("proposed_weeks").toString();
        int proposed_classroom_id_val = reqQuery.value("proposed_classroom_id").toInt();

        // 2. 再次检查新排课时间的冲突, 排除原 schedule_id (因为它将被修改)
        QString conflict_detail_msg;
        // 冲突检查：检查原课程的教师(teacher_id_val)在拟议的新时间(proposed_*)是否空闲，
        // 以及拟议的新教室(proposed_classroom_id_val)在拟议的新时间是否空闲。
        // course_id_for_conflict_check 用来确定正确的学期 (year, semester_enum) 进行比较。
        // original_schedule_id 作为 exclude_schedule_id 是因为我们正在“移动”这个排课。
        if (checkScheduleConflictAdmin(course_id_for_conflict_check, teacher_id_val, proposed_classroom_id_val,
                                       proposed_week_day_val, proposed_section_id_val, proposed_weeks_val,
                                       original_schedule_id, conflict_detail_msg)) {
            db.rollback();
            error = "批准失败：拟议的调课时间存在冲突。" + conflict_detail_msg;
            return false;
        }

        // 3. 更新 schedules 表
        _query->prepare(
            "UPDATE schedules SET section_id = :psid, week_day = :pwd, weeks = :pw, classroom_id = :pcrid "
            "WHERE schedule_id = :osid_update"
            );
        _query->bindValue(":psid", proposed_section_id_val);
        _query->bindValue(":pwd", proposed_week_day_val);
        _query->bindValue(":pw", proposed_weeks_val);
        _query->bindValue(":pcrid", proposed_classroom_id_val);
        _query->bindValue(":osid_update", original_schedule_id); // 更新的是原始排课记录

        if (!_query->exec()) {
            db.rollback();
            error = "数据库错误：更新课程安排表失败 (申请ID: " + QString::number(requestId) + ")。" + _query->lastError().text();
            qWarning() << error;
            return false;
        }

        // 4. 更新请求状态
        _query->prepare("UPDATE schedule_change_requests SET status = 'approved', approver_id = :aid_scr, processed_at = NOW() WHERE request_id = :id_scr");
        _query->bindValue(":aid_scr", approver_user_id);
        _query->bindValue(":id_scr", requestId);
        if (_query->exec()) {
            overall_success = true;
        } else {
            // 如果这里失败，事务会回滚所有更改
            error = "数据库错误：更新调课申请状态失败。" + _query->lastError().text();
            qWarning() << error;
            // overall_success 保持 false
        }

    } else if (requestType == "exam_arrangement") {
        // 1. 获取考试安排申请的详细信息
        QSqlQuery reqQuery(db);
        reqQuery.prepare(
            "SELECT course_id, proposed_exam_type, proposed_exam_date, proposed_section_id, proposed_classroom_id, proposed_duration, status "
            "FROM exam_arrangement_requests WHERE request_id = :id"
            );
        reqQuery.bindValue(":id", requestId);

        if (!reqQuery.exec()) {
            db.rollback();
            error = "数据库错误：查询考试安排申请信息失败。" + reqQuery.lastError().text();
            qWarning() << error;
            return false;
        }
        if (!reqQuery.first()) {
            db.rollback();
            error = "操作失败：考试安排申请 (ID: " + QString::number(requestId) + ") 不存在。";
            return false;
        }
        if (reqQuery.value("status").toString() != "pending") {
            db.rollback();
            error = "操作失败：该考试安排申请 (ID: " + QString::number(requestId) + ") 当前状态不是“待审批”。";
            return false;
        }

        int course_id_val = reqQuery.value("course_id").toInt();
        QString exam_type_val = reqQuery.value("proposed_exam_type").toString();
        QDate exam_date_val = reqQuery.value("proposed_exam_date").toDate();
        int section_id_val = reqQuery.value("proposed_section_id").toInt();
        QVariant classroom_id_qvariant = reqQuery.value("proposed_classroom_id"); // 可能是 NULL
        int classroom_id_to_check = classroom_id_qvariant.isNull() ? 0 : classroom_id_qvariant.toInt(); // 0 表示未指定或无效ID
        int duration_val = reqQuery.value("proposed_duration").toInt();

        // 2. 检查考场在指定日期和节次是否空闲 (如果指定了考场)
        if (classroom_id_to_check > 0) { // 只有当 classroom_id 是一个有效正整数时才检查
            QString classroom_conflict_msg;
            // 对于新创建的考试，exclude_exam_id 为 0 (因为还没有 exam_id)
            if (!isClassroomFreeForExam(classroom_id_to_check, exam_date_val, section_id_val, 0, classroom_conflict_msg)) {
                db.rollback();
                error = "批准失败：拟议的考场或时间存在冲突。" + classroom_conflict_msg;
                return false;
            }
        } else if (classroom_id_to_check == 0 && !classroom_id_qvariant.isNull()){
            // 如果 classroom_id 在数据库中不是 NULL，但其值是0或其他无效ID
            db.rollback();
            error = "批准失败：申请中提供的考场ID (例如0) 无效。如果未指定考场，classroom_id 字段应为 NULL。";
            return false;
        }
        // 如果 classroom_id_qvariant.isNull()，意味着申请中未指定考场。
        // 此时，业务逻辑可能是：
        // a) 拒绝申请，要求必须指定考场。
        // b) 管理员手动查找并分配一个空闲考场，然后更新申请记录或直接创建考试记录（这需要前端交互支持）。
        // c) 系统有自动分配空闲考场的逻辑（更复杂）。
        // 当前函数假设如果 classroom_id 为 NULL，则不进行教室冲突检查，并会在 exams 表中插入 NULL。

        // 3. 在 exams 表创建新记录
        _query->prepare(
            "INSERT INTO exams (course_id, exam_type, exam_date, section_id, classroom_id, duration) "
            "VALUES (:cid_exam, :type_exam, :date_exam, :sid_exam, :crid_exam, :duration_exam)"
            );
        _query->bindValue(":cid_exam", course_id_val);
        _query->bindValue(":type_exam", exam_type_val);
        _query->bindValue(":date_exam", exam_date_val);
        _query->bindValue(":sid_exam", section_id_val);
        // 如果 classroom_id_qvariant 为 NULL，则绑定 QVariant(QVariant::Int) 以插入数据库 NULL
        _query->bindValue(":crid_exam", classroom_id_qvariant.isNull() ? QVariant() : classroom_id_to_check);
        _query->bindValue(":duration_exam", duration_val);

        if (!_query->exec()) {
            db.rollback();
            error = "数据库错误：创建考试记录失败 (申请ID: " + QString::number(requestId) + ")。" + _query->lastError().text();
            qWarning() << error;
            return false;
        }

        // 4. 更新请求状态
        _query->prepare("UPDATE exam_arrangement_requests SET status = 'approved', approver_id = :aid_ear, processed_at = NOW() WHERE request_id = :id_ear");
        _query->bindValue(":aid_ear", approver_user_id);
        _query->bindValue(":id_ear", requestId);
        if (_query->exec()) {
            overall_success = true;
        } else {
            error = "数据库错误：更新考试安排申请状态失败。" + _query->lastError().text();
            qWarning() << error;
            // overall_success 保持 false
        }
    } else {
        db.rollback(); // 回滚，因为请求类型未知
        error = "操作失败：未知的请求类型 '" + requestType + "'。";
        return false;
    }

    // 最终提交或回滚事务
    if (overall_success) {
        if (!db.commit()) {
            error = "数据库错误：提交事务失败。" + db.lastError().text();
            qWarning() << error;
            // 关键：如果commit失败，数据库可能处于不一致状态。
            // 之前的操作（如UPDATE schedules 或 INSERT exams）可能已部分写入但未最终确认。
            // 尝试回滚，但效果不确定。
            db.rollback(); // 尝试回滚
            return false;
        }
        error = "请求 (ID: " + QString::number(requestId) + ", 类型: " + requestType + ") 已成功批准。";
        return true;
    } else {
        db.rollback(); // 如果任何步骤失败（overall_success 为 false），回滚所有操作
        // 'error' 应该已经被具体的失败步骤设置了
        return false;
    }
}

bool SqlServer::rejectRequest(int requestId, const QString &requestType, int approver_user_id, const QString &reason, QString &error)
{
    if (reason.isEmpty()) {
        error = "Rejection reason cannot be empty.";
        return false;
    }

    QString tableName;
    if (requestType == "schedule_change") {
        tableName = "schedule_change_requests";
    } else if (requestType == "exam_arrangement") {
        tableName = "exam_arrangement_requests";
    } else {
        error = "Unknown request type: " + requestType;
        return false;
    }

    // 检查请求是否存在且为 pending
    QSqlQuery checkQuery(db);
    checkQuery.prepare(QString("SELECT status FROM %1 WHERE request_id = :id").arg(tableName));
    checkQuery.bindValue(":id", requestId);
    if(!checkQuery.exec() || !checkQuery.first()){
        error = "Request (ID: " + QString::number(requestId) + ", Type: " + requestType + ") not found.";
        return false;
    }
    if(checkQuery.value("status").toString() != "pending"){
        error = "Request (ID: " + QString::number(requestId) + ") is not in 'pending' state.";
        return false;
    }


    _query->prepare(
        QString("UPDATE %1 SET status = 'rejected', approver_id = :aid, reason = :reason, processed_at = NOW() " // reason 字段需加到 exam_arrangement_requests
                "WHERE request_id = :id AND status = 'pending'").arg(tableName) // Double check status
        );
    _query->bindValue(":aid", approver_user_id);
    _query->bindValue(":reason", reason); // 确保你的 exam_arrangement_requests 表也有 reason 字段
    _query->bindValue(":id", requestId);

    if (!_query->exec()) {
        error = "Failed to reject request (ID: " + QString::number(requestId) + ", Type: " + requestType + "): " + _query->lastError().text();
        qWarning() << error;
        return false;
    }

    if (_query->numRowsAffected() > 0) {
        error = "Request (ID: " + QString::number(requestId) + ", Type: " + requestType + ") rejected successfully.";
        return true;
    } else {
        // 可能是请求ID不存在或状态已改变
        error = "Failed to reject request: Request not found in pending state or no change made.";
        return false;
    }
}










