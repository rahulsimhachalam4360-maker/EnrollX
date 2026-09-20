package com.enrollx.fee.student;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, String> {

    boolean existsByRollNoIgnoreCase(String rollNo);

    boolean existsByRollNoIgnoreCaseAndIdNot(String rollNo, String id);

    /**
     * search matches name OR rollNo OR phone (case-insensitive, partial);
     * course is an exact match. Both are optional — null means no filter.
     * The status filter cannot live here: feeStatus is derived, not a column.
     *
     * @param search already lowercased and wrapped in % by the service, or null
     */
    @Query("""
            select s from Student s
            where (:search is null
                   or lower(s.name) like :search
                   or lower(s.rollNo) like :search
                   or lower(s.phone) like :search)
              and (:course is null or s.course = :course)
            order by s.rollNo asc
            """)
    List<Student> search(@Param("search") String search, @Param("course") String course);

    @Query("select distinct s.course from Student s where s.course is not null order by s.course asc")
    List<String> findDistinctCourses();

    /** Highest n in "STU-n", so IdGenerator can continue the sequence. */
    @Query("select max(cast(substring(s.id, 5) as integer)) from Student s")
    Integer findMaxIdSequence();
}
