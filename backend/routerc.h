#ifndef ROUTERC_H
#define ROUTERC_H

#include <QObject>
#include <QHttpServer> // QHttpServer 定义
#include "sqlserver.h" // 需要 SqlServer 类的定义
#include <QHttpHeaders>
#include <QFile>
class routerc : public QObject
{
    Q_OBJECT
public:
    explicit routerc(QObject *parent = nullptr);

    void setsql(SqlServer * p);
    void setupRoutes(QHttpServer &server);

private:
    SqlServer* m_db; // 指向数据库操作类的指针，用于在路由处理函数中访问数据库

    // 未来展望：
    // 随着路由增多，可以将特定资源（如用户、课程、教室等）的路由处理逻辑
    // 封装到独立的 Handler 类中。例如：
    // AuthHandler m_authHandler;
    // CourseHandler m_courseHandler;
    // ...

    // 也可以将一些通用的路由处理辅助函数声明为私有静态方法，
    // 或者放在一个专门的 HttpUtils 命名空间/类中。


};

#endif // ROUTERC_H
