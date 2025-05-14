// main.cpp

#include <QCoreApplication>
#include <QHttpServer>
#include <QDebug>       // 用于 qInfo, qWarning, qCritical
#include <QCommandLineParser>
#include <QCommandLineOption>
#include <QSettings>    // 可选：用于从配置文件读取端口等
#include <QTcpServer>
#include "sqlserver.h"  // 数据库管理类
#include "router.h"     // API路由配置类

// 函数：尝试从配置文件或环境变量获取端口，否则使用默认值
quint16 getServerPort() {
    quint16 defaultPort = 8080;
    quint16 port = defaultPort;

    // 1. 尝试从环境变量读取 (例如 ISS_PORT)
    QByteArray envPort = qgetenv("ISS_PORT");
    if (!envPort.isEmpty()) {
        bool ok;
        int p = envPort.toInt(&ok);
        if (ok && p > 0 && p < 65536) {
            port = static_cast<quint16>(p);
            qInfo() << "从环境变量 ISS_PORT 获取端口:" << port;
            return port;
        } else {
            qWarning() << "环境变量 ISS_PORT 值无效:" << envPort << "将使用默认或配置文件端口。";
        }
    }

    // 2. 尝试从配置文件读取 (例如 config.ini 在应用目录下)
    // QSettings settings("config.ini", QSettings::IniFormat);
    // if (settings.contains("server/port")) {
    //     bool ok;
    //     int p = settings.value("server/port").toInt(&ok);
    //     if (ok && p > 0 && p < 65536) {
    //         port = static_cast<quint16>(p);
    //         qInfo() << "从配置文件 config.ini 获取端口:" << port;
    //         return port;
    //     } else {
    //         qWarning() << "配置文件中的 server/port 值无效:" << settings.value("server/port").toString()
    //                    << "将使用默认端口。";
    //     }
    // }

    qInfo() << "未从环境变量或配置文件中获取端口，使用默认端口:" << port;
    return port;
}


int main(int argc, char *argv[]) {
    QCoreApplication a(argc, argv);
    QCoreApplication::setApplicationName("InformationSystemServer");
    QCoreApplication::setApplicationVersion("1.0.0");

    // --- 命令行参数解析 (可选，用于覆盖端口等) ---
    QCommandLineParser parser;
    parser.setApplicationDescription("后端信息系统服务器");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption portOption(QStringList() << "p" << "port",
                                  "服务器监听的端口号。",
                                  "port_number");
    parser.addOption(portOption);
    parser.process(a);

    quint16 port = getServerPort(); // 先从配置/环境获取
    if (parser.isSet(portOption)) {
        bool ok;
        int cliPort = parser.value(portOption).toInt(&ok);
        if (ok && cliPort > 0 && cliPort < 65536) {
            port = static_cast<quint16>(cliPort);
            qInfo() << "通过命令行参数 -p/--port 设置端口为:" << port;
        } else {
            qWarning() << "命令行指定的端口号无效:" << parser.value(portOption) << "将使用配置/默认端口:" << port;
        }
    }

    // --- 初始化数据库管理器 ---
    qInfo() << "正在初始化数据库管理器...";
    SqlServer dbManager; // SqlServer的构造函数会尝试连接数据库并打印信息
    // 这里可以添加一个检查 dbManager 是否成功连接的逻辑（如果SqlServer类提供了这样的方法）
    // 例如: if (!dbManager.isConnected()) { qCritical() << "数据库连接失败，服务器无法启动。"; return 1; }
    qInfo() << "数据库管理器初始化完成（连接状态请查看SqlServer构造函数输出）。";

    // --- 初始化并配置HTTP服务器 ---
    qInfo() << "正在初始化HTTP服务器...";
    QHttpServer httpServer;

    // --- 配置API路由 ---
    qInfo() << "正在配置API路由...";
    Router apiRouter(&dbManager);   // 创建路由实例，并传入数据库管理器
    apiRouter.setupRoutes(httpServer); // 调用Router类的方法来设置所有API路由

    // --- 启动服务器监听 ---
    // QHttpServer::listen() 会尝试绑定到指定地址和端口并开始监听。
    // 它返回实际监听的端口号，如果失败则返回0。
    QTcpServer tcpserver;
    qInfo() << "服务器尝试在地址" << QHostAddress::Any << "端口" << port << "上启动监听...";
    const quint16 actualPort = tcpserver.listen(QHostAddress::Any, port)&&httpServer.bind(&tcpserver);

    if (!actualPort) {
        qCritical() << "服务器启动失败! 无法在端口" << port << "上监听。";


        return 1; // 返回错误码
    }

    if (actualPort != port) {
        qWarning() << "服务器实际监听端口与请求端口不符。请求端口:" << port << ", 实际监听端口:" << actualPort;
        // 这通常在请求端口为0（自动选择）时发生
    }

    qInfo() << "======================================================";
    qInfo() << QCoreApplication::applicationName() << "版本" << QCoreApplication::applicationVersion() << "已成功启动！";
    qInfo() << "服务器正在监听: http://"
            << (QHostAddress::Any == QHostAddress::AnyIPv4 ? "0.0.0.0" : "[::]") // 更明确的监听地址
            << ":" << actualPort;
    qInfo() << "使用Ctrl+C停止服务器。";
    qInfo() << "======================================================";
    qInfo() << "基本测试端点:";
    qInfo() << "  登录 (POST): http://localhost:" << actualPort << "/api/auth/login";
    qInfo() << "  获取当前用户 (GET): http://localhost:" << actualPort << "/api/auth/me (需提供Bearer Token)";
    qInfo() << "  获取当前学期 (GET): http://localhost:" << actualPort << "/api/semesters/current";
    qInfo() << "  管理员获取课程 (GET): http://localhost:" << actualPort << "/api/admin/courses (需管理员Token)";


    // --- 进入Qt事件循环 ---
    return a.exec();
}
