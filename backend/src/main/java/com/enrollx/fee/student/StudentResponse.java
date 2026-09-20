package com.enrollx.fee.student;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * The student shape the front-end reads. The last four fields are computed on
 * every read and are not columns:
 *
 * <pre>
 *   totalFee  = tuition + transport + hostel + exam + other
 *   paid      = SUM(amount) of that student's payments
 *   due       = max(totalFee - paid, 0)
 *   feeStatus = unpaid | partial | paid
 * </pre>
 */
public record StudentResponse(
        String id,
        String name,
        String rollNo,
        String course,
        int year,
        String section,
        String email,
        String phone,
        String guardian,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate admissionDate,
        String status,
        Fees fees,
        long totalFee,
        long paid,
        long due,
        String feeStatus) {

    public static StudentResponse of(Student student, long paid) {
        long totalFee = student.getFees().total();
        long due = Math.max(totalFee - paid, 0);

        return new StudentResponse(
                student.getId(),
                student.getName(),
                student.getRollNo(),
                student.getCourse(),
                student.getYear(),
                student.getSection(),
                student.getEmail(),
                student.getPhone(),
                student.getGuardian(),
                student.getAdmissionDate(),
                student.getStatus(),
                student.getFees(),
                totalFee,
                paid,
                due,
                feeStatus(totalFee, paid));
    }

    /** Mirrors Utils.feeStatus in the front-end, and drives the status filter. */
    public static String feeStatus(long totalFee, long paid) {
        if (paid <= 0) {
            return "unpaid";
        }
        if (paid >= totalFee) {
            return "paid";
        }
        return "partial";
    }
}
