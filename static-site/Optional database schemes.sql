-- 用户表
create table users (
    id int auto_increment primary key,
    username varchar(50) not null unique,
    password varchar(100) not null, 
    role enum('student','teacher','admin') not null,
    email varchar(100),
    created_at timestamp default current_timestamp
);

-- 教室表
create table classrooms (
    id int auto_increment primary key,
    name varchar(50) not null unique,
    capacity int not null,
    building varchar(50) not null,
    floor int not null
);

-- 课程表
create table courses (
    id int auto_increment primary key,
    name varchar(100) not null,
    teacher_id int not null,
    credit tinyint not null,
    foreign key (teacher_id) references users(id)
);

-- 课表安排表
create table schedules (
    id int auto_increment primary key,
    course_id int not null,
    classroom_id int not null,
    user_id int not null,  
    day_of_week tinyint not null CHECK (day_of_week between 1 and 7),
    start_time time not null,
    end_time time not null,
    foreign key (course_id) references courses(id),
    foreign key (classroom_id) references classrooms(id),
    foreign key (user_id) references users(id),
    unique KEY (classroom_id, day_of_week, start_time)  
);

-- 系统通知表
create table notifications (
    id int auto_increment primary key,
    user_id int not null,
    title varchar(100) not null,
    content text not null,
    type enum('schedule','exam','system') not null,
    is_read boolean default false,
    created_at timestamp default current_timestamp,
    foreign key (user_id) references users(id)
);