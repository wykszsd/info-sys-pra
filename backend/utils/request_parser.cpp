#include "request_parser.h"
#include <QJsonDocument>
#include <QDebug>
#include <QStringList>
#include <QJsonArray>
namespace RequestParser {

// --- 辅助函数实现 ---
QVariant getQueryParamAsInt(const QUrlQuery& query, const QString& key, bool& present, bool& ok) {
    present = query.hasQueryItem(key);
    if (present) {
        QString valueStr = query.queryItemValue(key);
        int value = valueStr.toInt(&ok);
        if (ok) {
            return value;
        } else {
            qWarning() << "RequestParser: Failed to convert query param" << key << "value" << valueStr << "to int.";
            return QVariant(); // 无效转换
        }
    }
    ok = true; // 如果不存在，也算 "ok" (没有转换失败)
    return QVariant(); //不存在
}

QString getQueryParamAsString(const QUrlQuery& query, const QString& key, bool& present) {
    present = query.hasQueryItem(key);
    if (present) {
        return query.queryItemValue(key);
    }
    return QString();
}


// --- ListQueryParams 构造函数 ---
ListQueryParams::ListQueryParams(const QUrlQuery& query) {
    bool ok;
    QVariant pageVal = getQueryParamAsInt(query, "page", pagePresent, ok);
    if (pagePresent && ok && pageVal.isValid()) page = pageVal.toInt();

    QVariant pageSizeVal = getQueryParamAsInt(query, "pageSize", pageSizePresent, ok);
    if (pageSizePresent && ok && pageSizeVal.isValid()) pageSize = pageSizeVal.toInt();

    QString sortStr = getQueryParamAsString(query, "sort", sortPresent);
    if (sortPresent && !sortStr.isEmpty()) {
        QStringList sortParts = sortStr.split(',');
        sortField = sortParts.value(0);
        if (sortParts.size() > 1 && (sortParts.value(1).toLower() == "asc" || sortParts.value(1).toLower() == "desc")) {
            sortOrder = sortParts.value(1).toLower();
        }
    }

    // 通用过滤器解析：
    // 前端可能发送 filter[key]=value 或 filter_key=value
    // QUrlQuery 会将 filter[key]=value 解析为键 "filter[key]"
    for (const auto& item : query.queryItems()) {
        const QString& key = item.first;
        const QString& value = item.second;

        if (key.startsWith("filter[")) { // 处理 filter[some_key]=value
            QString actualKey = key.mid(7, key.length() - 8); // 提取 "some_key"
            if (!actualKey.isEmpty()) {
                filters[actualKey] = value;
            }
        } else if (key.startsWith("filter_")) { // 处理 filter_some_key=value
            QString actualKey = key.mid(7);
            if (!actualKey.isEmpty()) {
                filters[actualKey] = value;
            }
        }
        // 对于没有 filter 前缀的特定参数 (如 filterRole)，由派生类处理
    }
}

// --- AdminCoursesFilterParams 构造函数 ---
AdminCoursesFilterParams::AdminCoursesFilterParams(const QUrlQuery& query) : ListQueryParams(query) {
    // 从 ListQueryParams::filters 中提取或直接从 query 中提取
    if (filters.contains("courseName_like")) {
        courseName_like = filters.value("courseName_like").toString();
    } else { // 作为备选，如果前端没有用 filter[key] 而是直接的 filter_key
        bool present;
        courseName_like = getQueryParamAsString(query, "filter_courseName_like", present);
        if(!present) courseName_like = getQueryParamAsString(query, "courseName_like", present); // 再备选，无前缀
    }


    if (filters.contains("courseCode_like")) {
        courseCode_like = filters.value("courseCode_like").toString();
    } else {
        bool present;
        courseCode_like = getQueryParamAsString(query, "filter_courseCode_like", present);
        if(!present) courseCode_like = getQueryParamAsString(query, "courseCode_like", present);
    }
    // 注意: 前端代码中 GetCoursesApiParams 的 filter 是 { courseName_like?: string; courseCode_like?: string; }
    // 当它被 axios 序列化为查询参数时，如果 params: { filter: { courseName_like: "X" } }
    // 那么 QUrlQuery 应该能通过 queryItemValue("filter[courseName_like]") 获取到 "X"
    // 所以 ListQueryParams 中的通用 filter 解析应该已经捕获了它们。
    // 这里只是为了更明确地将它们赋给特定成员变量。
}

// --- AdminClassroomsFilterParams 构造函数 ---
AdminClassroomsFilterParams::AdminClassroomsFilterParams(const QUrlQuery& query) : ListQueryParams(query) {
    if (filters.contains("building_like")) {
        building_like = filters.value("building_like").toString();
    } else {
        bool present;
        building_like = getQueryParamAsString(query, "filter_building_like", present);
        if(!present) building_like = getQueryParamAsString(query, "building_like", present);
    }

    if (filters.contains("equipment_eq")) {
        equipment_eq = filters.value("equipment_eq").toString();
    } else {
        bool present;
        equipment_eq = getQueryParamAsString(query, "filter_equipment_eq", present);
        if(!present) equipment_eq = getQueryParamAsString(query, "equipment_eq", present);

    }
}

// --- AdminUsersFilterParams 构造函数 ---
AdminUsersFilterParams::AdminUsersFilterParams(const QUrlQuery& query) : ListQueryParams(query) {
    bool present;
    filterRole = getQueryParamAsString(query, "filterRole", present);
    filterUsername_like = getQueryParamAsString(query, "filterUsername", present); // 前端用 filterUsername
}

// --- AdminSchedulesFilterParams 构造函数 ---
AdminSchedulesFilterParams::AdminSchedulesFilterParams(const QUrlQuery& query) : ListQueryParams(query) {
    bool present, ok;
    filterCourseId = getQueryParamAsInt(query, "filterCourseId", present, ok);
    if(present && !ok) filterCourseId.clear(); // 无效转换则清空

    filterTeacherId = getQueryParamAsString(query, "filterTeacherId", present);

    filterClassroomId = getQueryParamAsInt(query, "filterClassroomId", present, ok);
    if(present && !ok) filterClassroomId.clear();

    filterSemesterId = getQueryParamAsInt(query, "filterSemesterId", present, ok);
    if(present && !ok) filterSemesterId.clear(); // semesterId 是必需的，上层逻辑应检查其有效性
}

// --- AdminPendingRequestsParams 构造函数 ---
AdminPendingRequestsParams::AdminPendingRequestsParams(const QUrlQuery& query) {
    bool present;
    // 前端在 adminRequestApi.getPendingRequests 调用时传递 currentFilter (即 filterType)
    // 并在 axiosInstance.get('/requests/pending', { params: { type: filterType } })
    // 所以后端应该解析 'type' 参数
    filterType = getQueryParamAsString(query, "type", present);
}


// --- EmptyClassroomQueryParams 构造函数 ---
EmptyClassroomQueryParams::EmptyClassroomQueryParams(const QUrlQuery& query) {
    bool present, ok;

    QString startDateStr = getQueryParamAsString(query, "startDate", present);
    if (present) startDate = QDate::fromString(startDateStr, Qt::ISODate);
    else { valid = false; parseError += "Missing startDate. "; }

    QString endDateStr = getQueryParamAsString(query, "endDate", present);
    if (present) endDate = QDate::fromString(endDateStr, Qt::ISODate);
    else { valid = false; parseError += "Missing endDate. "; }

    QString sectionsStr = getQueryParamAsString(query, "sections", present);
    if (present && !sectionsStr.isEmpty()) {
        QStringList sectionListStr = sectionsStr.split(',');
        for (const QString& sIdStr : sectionListStr) {
            bool sOk;
            int sId = sIdStr.toInt(&sOk);
            if (sOk) {
                sectionIds.append(sId);
            } else {
                valid = false; parseError += "Invalid sectionId: " + sIdStr + ". ";
            }
        }
        if (sectionIds.isEmpty()){
            valid = false; parseError += "Sections parameter provided but resulted in empty list. ";
        }
    } else {
        valid = false; parseError += "Missing or empty sections. ";
    }

    building = getQueryParamAsString(query, "building", present);
    // building 是可选的，所以 'present' 为 false 不是错误

    minCapacity = getQueryParamAsInt(query, "minCapacity", present, ok);
    if(present && !ok) {
        minCapacity.clear(); // 无效转换
        valid = false; parseError += "Invalid minCapacity value. ";
    }
    // minCapacity 是可选的

    if (!startDate.isValid() && startDateStr!="") { valid = false; parseError += "Invalid startDate format. "; }
    if (!endDate.isValid() && endDateStr!="") { valid = false; parseError += "Invalid endDate format. "; }
    if (valid && startDate > endDate) { valid = false; parseError += "startDate cannot be after endDate. "; }
}

// --- TimetableQueryParams 构造函数 ---
TimetableQueryParams::TimetableQueryParams(const QUrlQuery& query) {
    bool semesterPresent, semesterOk, weekPresent, weekOk;
    QVariant semIdVar = getQueryParamAsInt(query, "semesterId", semesterPresent, semesterOk);
    QVariant weekVar = getQueryParamAsInt(query, "week", weekPresent, weekOk);

    if (semesterPresent && semesterOk && semIdVar.isValid()) {
        semesterId = semIdVar.toInt();
    } else {
        parseError += "Invalid or missing 'semesterId'. ";
    }

    if (weekPresent && weekOk && weekVar.isValid()) {
        week = weekVar.toInt();
    } else {
        parseError += "Invalid or missing 'week'. ";
    }

    if (semesterId > 0 && week > 0) { // 基本有效性检查
        valid = true;
    } else {
        valid = false;
        if (parseError.isEmpty()) parseError = "SemesterId and week must be positive integers.";
    }
}

// --- 递归转换 QJsonValue, QJsonObject, QJsonArray 的键 ---
QJsonObject RequestParser::convertJsonObjectKeys(const QJsonObject& obj, std::function<QString(const QString&)> keyConverter) {
    QJsonObject resultObj;
    for (auto it = obj.constBegin(); it != obj.constEnd(); ++it) {
        QString newKey = keyConverter(it.key());
        resultObj[newKey] = convertJsonValueKeys(it.value(), keyConverter);
    }
    return resultObj;
}

QJsonArray RequestParser::convertJsonArrayKeys(const QJsonArray& arr, std::function<QString(const QString&)> keyConverter) {
    QJsonArray resultArray;
    for (const QJsonValue& val : arr) {
        resultArray.append(convertJsonValueKeys(val, keyConverter));
    }
    return resultArray;
}

QJsonValue RequestParser::convertJsonValueKeys(const QJsonValue& value, std::function<QString(const QString&)> keyConverter) {
    if (value.isObject()) {
        return QJsonValue(convertJsonObjectKeys(value.toObject(), keyConverter));
    } else if (value.isArray()) {
        return QJsonValue(convertJsonArrayKeys(value.toArray(), keyConverter));
    }
    return value; // 基本类型直接返回
}


QString RequestParser::camelToSnake(const QString& s) {
    QString result;
    if (s.isEmpty()) return result;

    for (int i = 0; i < s.length(); ++i) {
        QChar c = s[i];
        if (c.isUpper()) {
            // Add underscore if:
            // 1. Not the first character
            // 2. AND (previous char was lowercase/digit OR (current char is not followed by another uppercase (to handle "URL" -> "url" not "u_r_l")))
            // For "userId" -> "user_id", a simpler rule works: if previous char is lowercase, add underscore.
            // Or, if this is an uppercase letter that starts an "acronym-like" part like "ID" in "userID".
            if (i > 0) {
                // If previous char is not uppercase, OR current char is uppercase AND next char is lowercase (e.g. UserID, N in Name)
                QChar prev = s[i-1];
                if (prev.isLower() || prev.isDigit() || (i + 1 < s.length() && s[i+1].isLower())) {
                    result.append('_');
                }
            }
            result.append(c.toLower());
        } else {
            result.append(c);
        }
    }
    return result;
}

QString RequestParser::snakeToCamel(const QString& s) {
    QString result;
    if (s.isEmpty()) return result;

    bool capitalizeNext = false;
    for (QChar c : s) {
        if (c == '_') {
            capitalizeNext = true;
        } else {
            if (capitalizeNext) {
                result.append(c.toUpper());
                capitalizeNext = false;
            } else {
                result.append(c);
            }
        }
    }
    return result;
}

// --- 递归转换 QJsonValue, QJsonObject, QJsonArray 的键 ---







// --- parseJsonBody 实现 ---
bool parseJsonBody(const QHttpServerRequest &request, QJsonObject &bodyJson, QString &errorMessage) {
    // (之前的实现是正确的，这里保持不变)
    if (request.method() != QHttpServerRequest::Method::Post &&
        request.method() != QHttpServerRequest::Method::Put &&
        request.method() != QHttpServerRequest::Method::Patch) {
        // 对于DELETE方法，有些API设计也可能允许body，但通常不常见
        // errorMessage = "Request method does not typically support a JSON body.";
        // return false;
    }

    QByteArray contentType = request.headers().value("Content-Type").toByteArray();
    // 有些客户端可能发送 application/json;charset=UTF-8
    if (!contentType.toLower().startsWith("application/json")) {
        errorMessage = "Content-Type header is not application/json. Received: " + QString::fromUtf8(contentType);
        // return false; // 有些情况下，即使没有严格的content-type，也可能尝试解析
    }

    QByteArray bodyData = request.body();
    if (bodyData.isEmpty()) {
        // 对于某些POST/PUT，空body可能是合法的（例如激活学期，只有路径参数）
        // 但如果API明确需要body，这里应该返回错误
        // 取决于调用者如何处理这个情况
        errorMessage = "Request body is empty.";
        // 如果空body是允许的，则不应设置错误，并返回true，让调用者检查bodyJson.isEmpty()
        // 但如果这里的目的是“解析一个非空的JSON body”，那么返回false是合适的。
        // 假设此函数用于必须有JSON body的场景：
        return false;
    }

    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(bodyData, &parseError);

    if (parseError.error != QJsonParseError::NoError) {
        errorMessage = "JSON parse error: " + parseError.errorString();
        qWarning() << "Failed to parse JSON body:" << errorMessage << "Body was:" << QString::fromUtf8(bodyData);
        return false;
    }

    if (!doc.isObject()) {
        errorMessage = "JSON body is not an object.";
        qWarning() << "JSON body is not an object. Body was:" << QString::fromUtf8(bodyData);
        return false;
    }

    QJsonObject originalObject = doc.object();
    bodyJson = convertJsonObjectKeys(originalObject, camelToSnake); // 从 camelCase 转为 snake_case
    return true;
}

QString mapInputToBitString(const QString &inputRangeString, int totalBits)
{
    if (totalBits <= 0) {
        qWarning() << "Total bits must be positive. Returning empty string.";
        return QString();
    }

    // 1. 初始化一个 QBitArray，所有位都为 false (0)
    QBitArray bitArray(totalBits, false);

    // 2. 分割输入字符串
    // 首先去除所有空格，以防输入如 "1, 4-6, 11"
    QString cleanedInput = inputRangeString;
    cleanedInput.remove(' ');

    QStringList parts = cleanedInput.split(',', Qt::SkipEmptyParts); // Qt::SkipEmptyParts 避免处理 "1,,2" 这种情况下的空部分

    bool conversionOk = true; // 标志转换是否一直成功

    for (const QString& part : parts) {
        if (part.isEmpty()) continue; // 如果分割后有空部分，跳过

        if (part.contains('-')) {
            // 处理范围，例如 "4-6"
            QStringList rangeLimits = part.split('-');
            if (rangeLimits.size() == 2) {
                bool okStart, okEnd;
                int start = rangeLimits[0].toInt(&okStart);
                int end = rangeLimits[1].toInt(&okEnd);

                if (okStart && okEnd) {
                    if (start < 1 || end > totalBits || start > end) {
                        qWarning() << "Invalid range in part:" << part << ". Start/End out of bounds [1," << totalBits << "] or start > end.";
                        conversionOk = false; // 标记一个解析错误
                        continue; // 跳过这个无效的范围
                    }
                    // 将1-based索引转换为0-based索引并设置位
                    for (int i = start; i <= end; ++i) {
                        if (i - 1 < bitArray.size()) { // 再次检查，以防万一
                            bitArray.setBit(i - 1, true);
                        }
                    }
                } else {
                    qWarning() << "Invalid number in range part:" << part;
                    conversionOk = false;
                }
            } else {
                qWarning() << "Invalid range format in part:" << part;
                conversionOk = false;
            }
        } else {
            // 处理单个数字，例如 "1" 或 "11"
            bool ok;
            int index = part.toInt(&ok);
            if (ok) {
                if (index < 1 || index > totalBits) {
                    qWarning() << "Index out of bounds in part:" << part << ". Must be between [1," << totalBits << "].";
                    conversionOk = false;
                    continue; // 跳过这个无效的索引
                }
                // 将1-based索引转换为0-based索引并设置位
                if (index - 1 < bitArray.size()) {
                    bitArray.setBit(index - 1, true);
                }
            } else {
                qWarning() << "Invalid number in part:" << part;
                conversionOk = false;
            }
        }
    }

    // (可选) 如果在解析过程中有任何错误，可以决定是否返回空字符串或部分结果
    // if (!conversionOk) {
    //     qWarning() << "There were errors during parsing. The result might be incomplete or incorrect.";
    //     // return QString(); // 或者继续返回部分结果
    // }


    // 3. 将 QBitArray 转换为 01 字符串
    QString resultString;
    resultString.reserve(totalBits); // 预分配空间以提高效率
    for (int i = 0; i < bitArray.size(); ++i) {
        resultString.append(bitArray.testBit(i) ? '1' : '0');
    }

    return resultString;
}

QString binaryToRangeString(const QString &binaryWeekString)
{
    QStringList resultSegments;
    int n = binaryWeekString.length();

    if (n == 0) {
        return ""; // 空输入返回空字符串
    }

    int i = 0;
    while (i < n) {
        if (binaryWeekString[i] == '1') {
            // 发现一个 '1'，这可能是一个单独的周，或者一个范围的开始
            int startWeek = i + 1; // 周次从1开始计数
            int j = i;

            // 向后查找连续的 '1'
            while (j < n && binaryWeekString[j] == '1') {
                j++;
            }

            // 连续的 '1' 结束于索引 j-1，对应的周次是 (j-1)+1 = j
            int endWeek = j; // 因为j是第一个0或者超出边界的位置, 所以(j-1)+1就是结束周

            if (startWeek == endWeek) {
                // 单独一周
                resultSegments.append(QString::number(startWeek));
            } else {
                // 连续多周
                resultSegments.append(QString::number(startWeek) + "-" + QString::number(endWeek));
            }
            i = j; // 从连续 '1' 序列的下一个位置继续扫描
        } else {
            // 当前是 '0'，直接跳过
            i++;
        }
    }

    return resultSegments.join(',');
}


} // namespace RequestParser
