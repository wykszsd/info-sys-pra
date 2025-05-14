#include "jwt_middleware.h"
#include <QDebug>
#include <QStringList>
#include <QByteArray> // 用于 Base64 编码
#include <QHttpHeaders>
namespace JwtMiddleware {

const QString SIMPLE_TOKEN_SUFFIX = ".MY_VERY_SIMPLE_SECRET_SUFFIX_THAT_IS_NOT_SECRET";
const char SEPARATOR = '.';

QString generateToken(int userId, const QString& username, const QString& role) {
    QString userIdStr = QString::number(userId);

    // 使用 Qt 的 Base64 编码
    QByteArray userIdBase64 = userIdStr.toUtf8().toBase64();
    QByteArray roleBase64 = role.toUtf8().toBase64();
    QByteArray usernameBase64 = username.toUtf8().toBase64();

    return QString::fromUtf8(userIdBase64) + SEPARATOR +
           QString::fromUtf8(roleBase64) + SEPARATOR +
           QString::fromUtf8(usernameBase64) +
           SIMPLE_TOKEN_SUFFIX;
}

bool verifyToken(const QHttpServerRequest &request, QJsonObject &userPayload) {
    QByteArray authHeader = request.headers().value("Authorization").toByteArray();
    if (!authHeader.startsWith("Bearer ")) {
        qDebug() << "验证失败：Authorization header 缺少 'Bearer ' 前缀。";
        return false;
    }

    QString tokenString = QString::fromUtf8(authHeader.mid(7)); // 移除 "Bearer "

    if (!tokenString.endsWith(SIMPLE_TOKEN_SUFFIX)) {
        qDebug() << "验证失败：Token 后缀不匹配。收到的 Token：" << tokenString;
        return false;
    }

    // 移除后缀，得到实际的 "payload" 部分
    QString payloadPart = tokenString.left(tokenString.length() - SIMPLE_TOKEN_SUFFIX.length());
    QStringList parts = payloadPart.split(SEPARATOR);

    if (parts.size() != 3) {
        qDebug() << "验证失败：Token 结构不正确（预期3部分）。收到的 Payload 部分：" << payloadPart;
        return false;
    }

    // 解码 Base64
    QByteArray userIdBytes = QByteArray::fromBase64(parts[0].toUtf8());
    QByteArray roleBytes = QByteArray::fromBase64(parts[1].toUtf8());
    QByteArray usernameBytes = QByteArray::fromBase64(parts[2].toUtf8());

    bool userIdOk;
    int userId = QString::fromUtf8(userIdBytes).toInt(&userIdOk);
    QString role = QString::fromUtf8(roleBytes);
    QString username = QString::fromUtf8(usernameBytes);

    if (!userIdOk || role.isEmpty() || username.isEmpty()) {
        qDebug() << "验证失败：解码后的部分数据无效或为空。";
        qDebug() << "解码后 UserID (ok? " << userIdOk << "): " << userId;
        qDebug() << "解码后 Role: " << role;
        qDebug() << "解码后 Username: " << username;
        return false;
    }

    userPayload["userId"] = userId;
    userPayload["role"] = role;
    userPayload["username"] = username; // 也把username存起来，虽然API清单中auth/me返回的user对象不直接包含它

    qInfo() << "极简 Token 验证通过：UserId=" << userId << ", Role=" << role << ", Username=" << username;
    return true;
}

// --- 黑名单的简化实现 (如果需要) ---
// 注意：对于这种不安全的token，黑名单的意义有限。
// 更好的方式是让token有非常短的生命周期，或者根本不实现黑名单，
// 因为攻击者可以轻易生成新的有效token。

// 假设 SqlServer 提供了基于token字符串本身的黑名单接口 (为了演示)
// extern SqlServer* g_db_ptr; // 全局指针或者通过其他方式传递 SqlServer 实例

/*
bool isTokenBlacklisted(const QString& tokenString, SqlServer* db) {
    if (!db) return true; // 保守起见
    // 假设 SqlServer 有这样一个方法 (这只是一个例子，你的 SqlServer 类目前没有这个)
    // return db->isSimpleTokenBlacklisted(tokenString);
    qWarning() << "isTokenBlacklisted (极简版) 未完全实现，总是返回 false";
    return false;
}

bool addTokenToBlacklist(const QString& tokenString, quint64 userId, QDateTime expiryTime, SqlServer* db, QString& message) {
    if (!db) {
        message = "数据库实例未初始化";
        return false;
    }
    // 同样，假设 SqlServer 有这样一个方法
    // return db->addSimpleTokenToBlacklist(tokenString, userId, expiryTime, message);
    qWarning() << "addTokenToBlacklist (极简版) 未完全实现，总是返回 true，消息：" << message;
    message = "Token (极简版) 已加入黑名单 (模拟)。";
    return true;
}
*/

} // namespace JwtMiddleware
