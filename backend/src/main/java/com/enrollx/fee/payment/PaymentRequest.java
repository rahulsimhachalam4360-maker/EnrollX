package com.enrollx.fee.payment;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * POST /api/payments body. The two rules that depend on other fields —
 * reference required for non-cash modes, and amount not above the outstanding
 * due — are enforced in {@link PaymentService}, where the database can be read.
 */
public record PaymentRequest(

        @NotBlank(message = "Select a student")
        String studentId,

        @Positive(message = "Amount must be greater than zero")
        long amount,

        @NotBlank(message = "Select a payment mode")
        String mode,

        @NotNull(message = "Payment date is required")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate date,

        String reference,

        String remarks) {
}
