// router.h

#ifndef ROUTER_H
#define ROUTER_H

#include <QHttpServer> // QHttpServer 定义
#include "sqlserver.h" // 需要 SqlServer 类的定义

class Router {
public:
    // 构造函数，接收一个 SqlServer 实例的指针
    // Router 类不拥有 SqlServer 实例的生命周期，它仅使用该实例
    explicit Router(SqlServer *db);

    // 主方法，用于在 QHttpServer 实例上设置所有API路由
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

#endif // ROUTER_H
