select a.title c_title,c.title p_title
from course a natural join prereq b,course c
where b.prereq_id=c.course_id;