package com.enrollx.fee.payment;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    /** One row per student, so a list of students costs two queries, not N+1. */
    interface PaidTotal {
        String getStudentId();

        long getPaid();
    }

    @Query("select p.student.id as studentId, sum(p.amount) as paid from Payment p group by p.student.id")
    List<PaidTotal> findPaidTotals();

    /**
     * The authoritative paid figure for one student. Recomputed inside the
     * payment transaction — a client-supplied balance is never trusted.
     */
    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.student.id = :studentId")
    long sumPaidByStudentId(@Param("studentId") String studentId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p")
    long sumAllAmounts();

    /**
     * Newest date first, then id descending. The join fetch pulls each
     * receipt's student in the same query for the joined studentName/rollNo/course.
     *
     * @param search already lowercased and wrapped in % by the service, or null
     */
    @Query("""
            select p from Payment p
            left join fetch p.student s
            where (:studentId is null or s.id = :studentId)
              and (:mode is null or p.mode = :mode)
              and (:from is null or p.date >= :from)
              and (:to is null or p.date <= :to)
              and (:search is null
                   or lower(s.name) like :search
                   or lower(s.rollNo) like :search
                   or lower(p.id) like :search
                   or lower(p.reference) like :search)
            order by p.date desc, p.id desc
            """)
    List<Payment> search(@Param("studentId") String studentId,
                         @Param("mode") String mode,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to,
                         @Param("search") String search);

    /** Dashboard: the 5 newest receipts, students fetched in the same query. */
    @EntityGraph(attributePaths = "student")
    @Query("select p from Payment p order by p.date desc, p.id desc")
    List<Payment> findRecent(Pageable pageable);

    /**
     * Rule 6: a receipt cannot outlive its student.
     *
     * <p>{@code clearAutomatically} matters here: a bulk delete does not touch
     * the persistence context, so without it the session would still hold those
     * receipts, pointing at a student that is about to be removed.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Payment p where p.student.id = :studentId")
    int deleteByStudentId(@Param("studentId") String studentId);

    /** Highest n in "RCP-n", so IdGenerator can continue the sequence. */
    @Query("select max(cast(substring(p.id, 5) as integer)) from Payment p")
    Integer findMaxIdSequence();
}
