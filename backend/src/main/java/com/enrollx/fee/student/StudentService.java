package com.enrollx.fee.student;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enrollx.fee.common.ApiException;
import com.enrollx.fee.common.IdGenerator;
import com.enrollx.fee.payment.PaymentRepository;

@Service
public class StudentService {

    private final StudentRepository students;
    private final PaymentRepository payments;
    private final IdGenerator ids;

    public StudentService(StudentRepository students, PaymentRepository payments, IdGenerator ids) {
        this.students = students;
        this.payments = payments;
        this.ids = ids;
    }

    /**
     * search/course are pushed into SQL; status filters on the derived feeStatus
     * and so is applied here. Two queries in total, whatever the row count:
     * the students, and one grouped sum of payments.
     */
    @Transactional(readOnly = true)
    public List<StudentResponse> list(String search, String course, String status) {
        List<Student> rows = students.search(like(search), blankToNull(course));
        Map<String, Long> paidByStudent = paidTotals();

        List<StudentResponse> result = rows.stream()
                .map(student -> StudentResponse.of(student, paidByStudent.getOrDefault(student.getId(), 0L)))
                .toList();

        String wanted = blankToNull(status);
        if (wanted == null) {
            return result;
        }
        return result.stream()
                .filter(row -> row.feeStatus().equalsIgnoreCase(wanted))
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentResponse get(String id) {
        Student student = require(id);
        return StudentResponse.of(student, payments.sumPaidByStudentId(id));
    }

    @Transactional
    public StudentResponse create(StudentRequest request) {
        if (students.existsByRollNoIgnoreCase(request.rollNo())) {
            throw ApiException.rollNoTaken(request.rollNo());
        }

        Student student = new Student();
        student.setId(ids.nextStudentId());
        apply(student, request);
        student.setStatus(blankToNull(request.status()) == null ? "active" : request.status());

        students.save(student);
        return StudentResponse.of(student, 0L);
    }

    @Transactional
    public StudentResponse update(String id, StudentRequest request) {
        Student student = require(id);

        if (students.existsByRollNoIgnoreCaseAndIdNot(request.rollNo(), id)) {
            throw ApiException.rollNoTaken(request.rollNo());
        }

        /* Rule 3: the fee structure may not be edited below what is collected. */
        long paid = payments.sumPaidByStudentId(id);
        if (request.fees().total() < paid) {
            throw ApiException.totalBelowPaid(paid);
        }

        apply(student, request);
        if (blankToNull(request.status()) != null) {
            student.setStatus(request.status());
        }

        students.save(student);
        return StudentResponse.of(student, paid);
    }

    /** Rule 6: the student's receipts go with them. */
    @Transactional
    public void delete(String id) {
        if (!students.existsById(id)) {
            throw ApiException.notFound("Student", id);
        }
        /* Receipts first: they hold the foreign key. */
        payments.deleteByStudentId(id);
        students.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<String> courses() {
        return students.findDistinctCourses();
    }

    /* ---- helpers ---------------------------------------------------------- */

    /** One grouped query for every student's paid total — never one per row. */
    @Transactional(readOnly = true)
    public Map<String, Long> paidTotals() {
        Map<String, Long> totals = new HashMap<>();
        for (PaymentRepository.PaidTotal row : payments.findPaidTotals()) {
            totals.put(row.getStudentId(), row.getPaid());
        }
        return totals;
    }

    private Student require(String id) {
        return students.findById(id).orElseThrow(() -> ApiException.notFound("Student", id));
    }

    private void apply(Student student, StudentRequest request) {
        student.setName(request.name().trim());
        student.setRollNo(request.rollNo().trim());
        student.setCourse(request.course().trim());
        student.setYear(request.year());
        student.setSection(request.section());
        student.setEmail(request.email());
        student.setPhone(request.phone());
        student.setGuardian(request.guardian());
        student.setAdmissionDate(request.admissionDate());
        student.setFees(request.fees());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    /** Lowercased and wrapped for a case-insensitive LIKE, or null for no filter. */
    private static String like(String value) {
        String trimmed = blankToNull(value);
        return trimmed == null ? null : "%" + trimmed.trim().toLowerCase() + "%";
    }
}
