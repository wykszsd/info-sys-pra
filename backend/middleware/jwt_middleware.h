#ifndef JWT_MIDDLEWARE_H
#define JWT_MIDDLEWARE_H

#include <QHttpServerRequest>
#include <QJsonObject>
#include <QString>

namespace JwtMiddleware {

// 生成一个极简的、不安全的 "token"
// 格式: base64(userId) + "." + base64(role) + "." + base64(username) + ".MY_VERY_SIMPLE_SECRET_SUFFIX"
// 注意：这里的 base64 只是为了让其看起来像 token，并没有加密作用。
// "MY_VERY_SIMPLE_SECRET_SUFFIX" 只是一个固定的后缀，用于“伪验证”。
QString generateToken(int userId, const QString& username, const QString& role);

// 验证这个极简的、不安全的 "token"
// userPayload: 如果 "token" "有效", 这里会填充解码后的 userId, role, username
bool verifyToken(const QHttpServerRequest &request, QJsonObject &userPayload);

// (黑名单功能对于这种极简token意义不大，因为token本身很容易伪造或重放，
// 但如果仍然需要，可以基于token字符串本身做黑名单)
// bool isTokenBlacklisted(const QString& tokenString);
// bool addTokenToBlacklist(const QString& tokenString);

} // namespace JwtMiddleware

#endif // JWT_MIDDLEWARE_H
