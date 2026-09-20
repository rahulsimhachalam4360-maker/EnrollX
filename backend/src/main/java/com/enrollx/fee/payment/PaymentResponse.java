package com.enrollx.fee.payment;

import java.time.Instant;
import java.time.LocalDate;

import com.enrollx.fee.student.Student;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A receipt as the front-end reads it, including the three joined student
 * fields it renders in the payments table and on the printed receipt.
 *
 * <p>{@code balanceAfter} is present only on the POST response; it is omitted
 * everywhere else.
 */
public record PaymentResponse(
        String id,
        String studentId,
        long amount,
        String mode,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate date,
        String reference,
        String remarks,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSX", timezone = "UTC") Instant createdAt,
        String studentName,
        String rollNo,
        String course,
        @JsonInclude(JsonInclude.Include.NON_NULL) Long balanceAfter) {

    private static final String DELETED_NAME = "Deleted student";
    private static final String MISSING = "-";

    public static PaymentResponse of(Payment payment) {
        return of(payment, null);
    }

    public static PaymentResponse of(Payment payment, Long balanceAfter) {
        Student student = payment.getStudent();

        return new PaymentResponse(
                payment.getId(),
                student == null ? MISSING : student.getId(),
                payment.getAmount(),
                payment.getMode(),
                payment.getDate(),
                payment.getReference() == null ? "" : payment.getReference(),
                payment.getRemarks() == null ? "" : payment.getRemarks(),
                payment.getCreatedAt(),
                student == null ? DELETED_NAME : student.getName(),
                student == null ? MISSING : student.getRollNo(),
                student == null ? MISSING : student.getCourse(),
                balanceAfter);
    }
}
