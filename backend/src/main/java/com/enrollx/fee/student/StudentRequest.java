package com.enrollx.fee.student;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST/PUT body for a student: StudentResponse minus id and the four derived
 * fields. {@code status} is absent from the form the UI submits, so it stays
 * optional here — the service defaults it on create and preserves it on update.
 */
public record StudentRequest(

        @NotBlank(message = "Name is required")
        @Size(min = 2, message = "Name must be at least 2 characters")
        String name,

        @NotBlank(message = "Roll number is required")
        String rollNo,

        @NotBlank(message = "Course is required")
        String course,

        @Min(value = 0, message = "Year cannot be negative")
        int year,

        String section,

        @Email(message = "Enter a valid email address")
        String email,

        @Pattern(regexp = "\\d{10}", message = "Phone must be exactly 10 digits")
        String phone,

        String guardian,

        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate admissionDate,

        String status,

        @Valid
        @NotNull(message = "Fee structure is required")
        Fees fees) {
}
