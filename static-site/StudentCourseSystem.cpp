// StudentCourseSystem.cpp
#include "StudentCourseSystem.h"
#include <QFile>
#include <QJsonDocument>
#include <QJsonArray>
#include <QDebug>

StudentCourseSystem::StudentCourseSystem(QObject *parent) : QObject(parent)
{
    // ��ʼ��һЩʾ������
    initializeSampleData();
}

bool StudentCourseSystem::login(const QString &username, const QString &password)
{
    if (m_userCredentials.contains(username) && m_userCredentials[username] == password) {
        m_currentUser = username;
        m_isAdmin = (username == "admin"); // ���ж��Ƿ�Ϊ����Ա
        return true;
    }
    return false;
}

bool StudentCourseSystem::logout()
{
    m_currentUser.clear();
    m_isAdmin = false;
    return true;
}

QJsonObject StudentCourseSystem::getStudentInfo(const QString &studentId)
{
    if (!m_students.contains(studentId)) {
        return QJsonObject();
    }

    const Student &student = m_students[studentId];
    QJsonObject obj;
    obj["id"] = student.id;
    obj["name"] = student.name;
    obj["department"] = student.department;
    
    return obj;
}

QJsonArray StudentCourseSystem::getAvailableCourses()
{
    QJsonArray array;
    for (const auto &course : m_courses) {
        if (course.enrolledCount < course.capacity) {
            QJsonObject obj;
            obj["code"] = course.code;
            obj["name"] = course.name;
            obj["teacher"] = course.teacher;
            obj["credit"] = course.credit;
            obj["capacity"] = course.capacity;
            obj["enrolledCount"] = course.enrolledCount;
            
            QJsonArray scheduleArray;
            for (const QString &time : course.schedule) {
                scheduleArray.append(time);
            }
            obj["schedule"] = scheduleArray;
            
            array.append(obj);
        }
    }
    return array;
}

bool StudentCourseSystem::enrollCourse(const QString &studentId, const QString &courseCode)
{
    if (!m_students.contains(studentId) return false;
    if (!m_courses.contains(courseCode)) return false;
    
    Student &student = m_students[studentId];
    Course &course = m_courses[courseCode];
    
    // ����Ƿ��Ѿ�ѡ���ÿγ�
    if (student.enrolledCourses.contains(courseCode)) {
        return false;
    }
    
    // ���γ��Ƿ�����
    if (course.enrolledCount >= course.capacity) {
        return false;
    }
    
    // ���ʱ���ͻ
    if (checkTimeConflict(student, course)) {
        return false;
    }
    
    // ��ӿγ�
    student.enrolledCourses.append(courseCode);
    course.enrolledCount++;
    
    return true;
}

bool StudentCourseSystem::dropCourse(const QString &studentId, const QString &courseCode)
{
    if (!m_students.contains(studentId)) return false;
    if (!m_courses.contains(courseCode)) return false;
    
    Student &student = m_students[studentId];
    Course &course = m_courses[courseCode];
    
    if (!student.enrolledCourses.contains(courseCode)) {
        return false;
    }
    
    student.enrolledCourses.removeOne(courseCode);
    course.enrolledCount--;
    
    return true;
}

QJsonArray StudentCourseSystem::getEnrolledCourses(const QString &studentId)
{
    QJsonArray array;
    
    if (!m_students.contains(studentId)) {
        return array;
    }
    
    const Student &student = m_students[studentId];
    for (const QString &courseCode : student.enrolledCourses) {
        if (m_courses.contains(courseCode)) {
            const Course &course = m_courses[courseCode];
            QJsonObject obj;
            obj["code"] = course.code;
            obj["name"] = course.name;
            obj["teacher"] = course.teacher;
            obj["credit"] = course.credit;
            array.append(obj);
        }
    }
    
    return array;
}

bool StudentCourseSystem::addCourse(const QJsonObject &courseInfo)
{
    if (!m_isAdmin) return false;
    
    QString code = courseInfo["code"].toString();
    if (code.isEmpty() || m_courses.contains(code)) {
        return false;
    }
    
    Course course;
    course.code = code;
    course.name = courseInfo["name"].toString();
    course.teacher = courseInfo["teacher"].toString();
    course.credit = courseInfo["credit"].toInt();
    course.capacity = courseInfo["capacity"].toInt();
    course.enrolledCount = 0;
    
    QJsonArray scheduleArray = courseInfo["schedule"].toArray();
    for (const QJsonValue &value : scheduleArray) {
        course.schedule.append(value.toString());
    }
    
    m_courses.insert(code, course);
    return true;
}

bool StudentCourseSystem::removeCourse(const QString &courseCode)
{
    if (!m_isAdmin) return false;
    
    if (!m_courses.contains(courseCode)) {
        return false;
    }
    
    // ������ѡ�˸ÿγ̵�ѧ�����Ƴ�
    for (auto &student : m_students) {
        student.enrolledCourses.removeOne(courseCode);
    }
    
    m_courses.remove(courseCode);
    return true;
}

bool StudentCourseSystem::updateCourse(const QString &courseCode, const QJsonObject &newInfo)
{
    if (!m_isAdmin) return false;
    
    if (!m_courses.contains(courseCode)) {
        return false;
    }
    
    Course &course = m_courses[courseCode];
    
    if (newInfo.contains("name")) {
        course.name = newInfo["name"].toString();
    }
    if (newInfo.contains("teacher")) {
        course.teacher = newInfo["teacher"].toString();
    }
    if (newInfo.contains("credit")) {
        course.credit = newInfo["credit"].toInt();
    }
    if (newInfo.contains("capacity")) {
        int newCapacity = newInfo["capacity"].toInt();
        if (newCapacity >= course.enrolledCount) {
            course.capacity = newCapacity;
        } else {
            return false;
        }
    }
    if (newInfo.contains("schedule")) {
        course.schedule.clear();
        QJsonArray scheduleArray = newInfo["schedule"].toArray();
        for (const QJsonValue &value : scheduleArray) {
            course.schedule.append(value.toString());
        }
    }
    
    return true;
}

QJsonArray StudentCourseSystem::getStudentsInCourse(const QString &courseCode)
{
    QJsonArray array;
    
    if (!m_courses.contains(courseCode)) {
        return array;
    }
    
    for (const auto &student : m_students) {
        if (student.enrolledCourses.contains(courseCode)) {
            QJsonObject obj;
            obj["id"] = student.id;
            obj["name"] = student.name;
            obj["department"] = student.department;
            array.append(obj);
        }
    }
    
    return array;
}

bool StudentCourseSystem::saveDataToFile(const QString &filename)
{
    QJsonObject root;
    
    // ����ѧ������
    QJsonObject studentsObj;
    for (const auto &student : m_students) {
        QJsonObject studentObj;
        studentObj["id"] = student.id;
        studentObj["name"] = student.name;
        studentObj["department"] = student.department;
        
        QJsonArray coursesArray;
        for (const QString &course : student.enrolledCourses) {
            coursesArray.append(course);
        }
        studentObj["courses"] = coursesArray;
        
        studentsObj[student.id] = studentObj;
    }
    root["students"] = studentsObj;
    
    // ����γ�����
    QJsonObject coursesObj;
    for (const auto &course : m_courses) {
        QJsonObject courseObj;
        courseObj["code"] = course.code;
        courseObj["name"] = course.name;
        courseObj["teacher"] = course.teacher;
        courseObj["credit"] = course.credit;
        courseObj["capacity"] = course.capacity;
        courseObj["enrolledCount"] = course.enrolledCount;
        
        QJsonArray scheduleArray;
        for (const QString &time : course.schedule) {
            scheduleArray.append(time);
        }
        courseObj["schedule"] = scheduleArray;
        
        coursesObj[course.code] = courseObj;
    }
    root["courses"] = coursesObj;
    
    // �����û�ƾ֤
    QJsonObject usersObj;
    for (auto it = m_userCredentials.begin(); it != m_userCredentials.end(); ++it) {
        usersObj[it.key()] = it.value();
    }
    root["users"] = usersObj;
    
    // д���ļ�
    QFile file(filename);
    if (!file.open(QIODevice::WriteOnly)) {
        return false;
    }
    
    file.write(QJsonDocument(root).toJson());
    file.close();
    
    return true;
}

bool StudentCourseSystem::loadDataFromFile(const QString &filename)
{
    QFile file(filename);
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (doc.isNull()) {
        return false;
    }
    
    QJsonObject root = doc.object();
    
    // ����ѧ������
    m_students.clear();
    QJsonObject studentsObj = root["students"].toObject();
    for (auto it = studentsObj.begin(); it != studentsObj.end(); ++it) {
        QJsonObject studentObj = it.value().toObject();
        Student student;
        student.id = studentObj["id"].toString();
        student.name = studentObj["name"].toString();
        student.department = studentObj["department"].toString();
        
        QJsonArray coursesArray = studentObj["courses"].toArray();
        for (const QJsonValue &value : coursesArray) {
            student.enrolledCourses.append(value.toString());
        }
        
        m_students.insert(student.id, student);
    }
    
    // ���ؿγ�����
    m_courses.clear();
    QJsonObject coursesObj = root["courses"].toObject();
    for (auto it = coursesObj.begin(); it != coursesObj.end(); ++it) {
        QJsonObject courseObj = it.value().toObject();
        Course course;
        course.code = courseObj["code"].toString();
        course.name = courseObj["name"].toString();
        course.teacher = courseObj["teacher"].toString();
        course.credit = courseObj["credit"].toInt();
        course.capacity = courseObj["capacity"].toInt();
        course.enrolledCount = courseObj["enrolledCount"].toInt();
        
        QJsonArray scheduleArray = courseObj["schedule"].toArray();
        for (const QJsonValue &value : scheduleArray) {
            course.schedule.append(value.toString());
        }
        
        m_courses.insert(course.code, course);
    }
    
    // �����û�ƾ֤
    m_userCredentials.clear();
    QJsonObject usersObj = root["users"].toObject();
    for (auto it = usersObj.begin(); it != usersObj.end(); ++it) {
        m_userCredentials.insert(it.key(), it.value().toString());
    }
    
    return true;
}

bool StudentCourseSystem::checkTimeConflict(const Student &student, const Course &newCourse)
{
    // ��ȡѧ����ѡ�γ̵�����ʱ��
    QList<QString> enrolledTimes;
    for (const QString &courseCode : student.enrolledCourses) {
        if (m_courses.contains(courseCode)) {
            enrolledTimes.append(m_courses[courseCode].schedule);
        }
    }
    
    // ����¿γ�ʱ���Ƿ��ͻ
    for (const QString &newTime : newCourse.schedule) {
        if (enrolledTimes.contains(newTime)) {
            return true; // ��ʱ���ͻ
        }
    }
    
    return false; // ��ʱ���ͻ
}

void StudentCourseSystem::initializeSampleData()
{
    // ��ʼ������Ա�˻�
    m_userCredentials.insert("admin", "admin123");
    
    // ���ʾ��ѧ��
    Student s1;
    s1.id = "1001";
    s1.name = "����";
    s1.department = "�������ѧ";
    m_students.insert(s1.id, s1);
    m_userCredentials.insert(s1.id, "stu1001");
    
    Student s2;
    s2.id = "1002";
    s2.name = "����";
    s2.department = "�������";
    m_students.insert(s2.id, s2);
    m_userCredentials.insert(s2.id, "stu1002");
    
    // ���ʾ���γ�
    Course c1;
    c1.code = "CS101";
    c1.name = "���������";
    c1.teacher = "������";
    c1.credit = 3;
    c1.capacity = 50;
    c1.enrolledCount = 0;
    c1.schedule = QStringList() << "��һ 8:00-10:00" << "���� 8:00-10:00";
    m_courses.insert(c1.code, c1);
    
    Course c2;
    c2.code = "CS201";
    c2.name = "���ݽṹ";
    c2.teacher = "�����";
    c2.credit = 4;
    c2.capacity = 40;
    c2.enrolledCount = 0;
    c2.schedule = QStringList() << "�ܶ� 10:00-12:00" << "���� 10:00-12:00";
    m_courses.insert(c2.code, c2);
    
    Course c3;
    c3.code = "MATH101";
    c3.name = "�ߵ���ѧ";
    c3.teacher = "�Ž���";
    c3.credit = 4;
    c3.capacity = 60;
    c3.enrolledCount = 0;
    c3.schedule = QStringList() << "��һ 14:00-16:00" << "���� 14:00-16:00";
    m_courses.insert(c3.code, c3);
}
