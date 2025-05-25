QT = core
QT += httpserver sql
CONFIG += c++17 cmdline

# You can make your code fail to compile if it uses deprecated APIs.
# In order to do so, uncomment the following line.
#DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000    # disables all the APIs deprecated before Qt 6.0.0

SOURCES += \
        main.cpp \
        middleware/jwt_middleware.cpp \
        passwordhasher.cpp \
        routerc.cpp \
        sqlserver.cpp \
        utils/request_parser.cpp

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target

HEADERS += \
    middleware/jwt_middleware.h \
    passwordhasher.h \
    routerc.h \
    sqlserver.h \
    utils/request_parser.h
INCLUDEPATH +=$$PWD/cryptoheaders/

LIBS += -L$$PWD/cryptolibs/

CONFIG(debug,debug|release){

LIBS += -lcryptlib_d
}
else{

LIBS += -lcryptlib
}

RESOURCES += \
    rec.qrc
