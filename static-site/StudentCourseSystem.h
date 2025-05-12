// StudentCourseSystem.h
#ifndef STUDENTCOURSESYSTEM_H
#define STUDENTCOURSESYSTEM_H

#include <QObject>
#include <QMap>
#include <QList>
#include <QString>
#include <QJsonObject>

class StudentCourseSystem : public QObject
{
    Q_OBJECT
public:
    explicit StudentCourseSystem(QObject *parent = nullptr);

    // ѧ�����ݽṹ
    struct Student {
        QString id;
        QString name;
        QString department;
        QList<QString> enrolledCourses;
    };

    // �γ����ݽṹ
    struct Course {
        QString code;
        QString name;
        QString teacher;
        int credit;
        int capacity;
        int enrolledCount;
        QList<QString> schedule; // �Ͽ�ʱ�䰲��
    };

    // �û���֤
    Q_INVOKABLE bool login(const QString &username, const QString &password);
    Q_INVOKABLE bool logout();

    // ѧ������
    Q_INVOKABLE QJsonObject getStudentInfo(const QString &studentId);
    Q_INVOKABLE QJsonArray getAvailableCourses();
    Q_INVOKABLE bool enrollCourse(const QString &studentId, const QString &courseCode);
    Q_INVOKABLE bool dropCourse(const QString &studentId, const QString &courseCode);
    Q_INVOKABLE QJsonArray getEnrolledCourses(const QString &studentId);

    // ��ʦ/����Ա����
    Q_INVOKABLE bool addCourse(const QJsonObject &courseInfo);
    Q_INVOKABLE bool removeCourse(const QString &courseCode);
    Q_INVOKABLE bool updateCourse(const QString &courseCode, const QJsonObject &newInfo);
    Q_INVOKABLE QJsonArray getStudentsInCourse(const QString &courseCode);

    // ���ݳ־û�
    bool saveDataToFile(const QString &filename);
    bool loadDataFromFile(const QString &filename);

private:
    QMap<QString, Student> m_students;
    QMap<QString, Course> m_courses;
    QMap<QString, QString> m_userCredentials; // �û���-����ӳ��

    QString m_currentUser;
    bool m_isAdmin;

    bool checkTimeConflict(const Student &student, const Course &newCourse);
    void initializeSampleData();
};

#endif // STUDENTCOURSESYSTEM_H
