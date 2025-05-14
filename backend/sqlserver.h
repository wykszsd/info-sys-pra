#ifndef SQLSERVER_H
#define SQLSERVER_H

#include <QObject>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSqlRecord>
#include "passwordhasher.h"
#include <algorithm>
class SqlServer : public QObject
{
    Q_OBJECT
public:
    explicit SqlServer(QObject *parent = nullptr);
~SqlServer();

signals:

private:
    QSqlDatabase  db;
    QSqlQuery *_query;

public :
    bool getYearAndSemesterFromId(int semester_id, int& year, QString& semester_enum_string);
    QJsonObject getUserProfile(int user_id);
    bool Registering(QString username,QString password,QString role,QString &str);
    QJsonArray getUserNotifications(int user_id, const QString& filter);
    QJsonArray getUserExamSchedule(int user_id, int semester_id);
    bool Logining(QString username,QString password,QJsonObject & ob,QString &str);
    QJsonArray getUserClassTable(int user_id, int semester_id, int target_week);
    QJsonArray getEmptyClassroom(QDate start_date, QDate end_date,
                                 const QString& building, const QString& room_type, // room_type 对应 equipment
                                 const QList<int>& section_ids, int min_capacity);


    bool addTokenToBlacklist(const QString& jti, quint64 userId, QDateTime expiryTime, QString& message);


    bool isTokenBlacklisted(const QString& jti);

 QJsonObject getClassroomDetails(int classroomId); // 新增
 QJsonObject getSemesterDetails(int semesterId);
    int cleanupExpiredBlacklistedTokens(QString& message);
    QJsonObject getCurrentSemesterInfo();
    QJsonArray getAllClassSections();
    QJsonArray getCoursesListShort(int semester_id = 0);
    QJsonArray getTeachersListShort();
    QJsonArray getClassroomsListShort();
    QStringList getDistinctBuildingNames();
    QJsonObject getSingleScheduleDetails(int scheduleId, QString& error);
    QString getRequestTypeById(int request_id, bool& found);
    bool markNotificationAsRead(int notification_id, int user_id, QString& message);
    bool markAllNotificationsAsRead(int user_id, int& markedCount, QString& message);
    QJsonArray getSelectableCourses(int semester_id, int student_user_id); // student_user_id 用于排除已选课程等逻辑
    QJsonArray getMyEnrollments(int student_user_id, int semester_id);
    QJsonArray getTaughtSchedulesByTeacher(const QString& teacher_db_id, int semester_id);
    QJsonArray getTaughtCoursesShortByTeacher(const QString& teacher_db_id, int semester_id);
    int createScheduleChangeRequest(const QString& teacher_db_id, const QJsonObject& payload, QString& message);
    int createExamArrangementRequest(const QString& teacher_db_id, const QJsonObject& payload, QString& message);
    QJsonArray getMyRequests(const QString& teacher_db_id);
    bool createAssignmentNotification(const QJsonObject& assignmentPayload, int teacher_user_id, QString& message);
QJsonObject getCourseDetails(int courseId, QString& errorMsg); // 新增

    // 学生选课操作
    // student_db_id: 学生的学号 (students.student_id)
    // schedule_id: 要选的课程安排ID
    // message: 操作结果/错误信息
    // 返回新创建的 enrollment_id，0 或负数表示失败
    // (可选) semester_id: 用于更精确地进行一些检查，例如课程是否属于当前学期
    int enrollCourse(const QString& student_db_id, int schedule_id, int semester_id, QString& message);



   bool isScheduleAvailableForEnrollment(int schedule_id, int semester_id, int& course_max_capacity, int& current_enrolled_count, QString& error_msg);




    bool  hasStudentAlreadyEnrolled(const QString& student_db_id, int schedule_id);

     bool checkTimeConflict(const QString& student_db_id, int new_schedule_id, int semester_id, QString& conflict_message);


     bool withdrawCourse(int enrollment_id, const QString& student_db_id, QString& message);


     bool canStudentWithdraw(int enrollment_id, const QString& student_db_id, QString& error_msg);

       QJsonArray getTeacherInvigilationSchedule(const QString& teacher_db_id, int semester_id);

      QJsonObject getSemestersList(int page, int pageSize, const QString& sortField, const QString& sortOrder, QString& error);
       int createSemester(const QJsonObject& payload, QString& error);

       bool updateSemester(int semesterId, const QJsonObject& payload, QString& error);

        bool deleteSemester(int semesterId, QString& error);//need check!
          bool activateSemester(int semesterId, QString& error);


          QJsonObject getClassroomsList(int page, int pageSize,
                                        const QString& sortField, const QString& sortOrder,
                                        const QJsonObject& filter, QString& error);

           int createClassroom(const QJsonObject& payload, QString& error);


            bool updateClassroom(int classroomId, const QJsonObject& payload, QString& error);

            bool deleteClassroom(int classroomId, QString& error);//need check!

            QJsonObject getCoursesListAdmin(int page, int pageSize,
                                            const QString& sortField, const QString& sortOrder,
                                            const QJsonObject& filter, QString& error);

              int createCourse(const QJsonObject& payload, QString& error);

              bool updateCourse(int courseId, const QJsonObject& payload, QString& error);

               bool deleteCourse(int courseId, QString& error);// need check!

              QJsonObject getUsersListAdmin(int page, int pageSize,
                                            const QString& sortField, const QString& sortOrder,
                                            const QJsonObject& filter, QString& error);

              int createUserAdmin(const QJsonObject& payload, QString& error);


               bool updateUserAdmin(int userId, const QJsonObject& payload, QString& error);//need check!


                 bool deleteUserAdmin(int userId, int currentAdminUserId, QString& error);

               QJsonObject getSchedulesListAdmin(int page, int pageSize,
                                                 const QString& sortField, const QString& sortOrder,
                                                 const QJsonObject& filter, QString& error);
               int createSchedule(const QJsonObject& payload, QString& error);
               bool checkScheduleConflictAdmin(int course_id_for_semester_check, const QString &teacher_id_to_check, int classroom_id_to_check, int week_day_to_check, int section_id_to_check, const QString &weeks_mask_to_check, int exclude_schedule_id, QString &conflict_detail);
                //need check!
                 bool updateSchedule(int scheduleId, const QJsonObject& payload, QString& error);

                  bool deleteSchedule(int scheduleId, QString& error);

                 QJsonArray getPendingRequestsAdmin(const QString& filterType, QString& cumulative_error);//need check!
         bool isClassroomFreeForExam(int classroom_id, const QDate& exam_date, int section_id,
                                              int exclude_exam_id, QString& detail_msg);

                  bool approveRequest(int requestId, const QString& requestType, int approver_user_id, QString& error);//need check!
                  bool rejectRequest(int requestId, const QString& requestType, int approver_user_id, const QString& reason, QString& error);

};

#endif // SQLSERVER_H
