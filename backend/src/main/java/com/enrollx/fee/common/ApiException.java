package com.enrollx.fee.common;

import java.text.NumberFormat;
import java.util.Locale;

import org.springframework.http.HttpStatus;

/**
 * The one exception the domain throws. It carries the HTTP status the
 * front-end should see, and {@link GlobalExceptionHandler} turns it into the
 * {@code { "message": ..., "status": ... }} body that js/api.js reads.
 *
 * <p>The static factories keep every user-facing message in one place, so the
 * wording the UI shows in a toast is never invented twice.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    /* ---- domain errors ---------------------------------------------------- */

    /** Rule 7: unknown id. */
    public static ApiException notFound(String entity, String id) {
        return new ApiException(entity + " " + id + " not found", HttpStatus.NOT_FOUND);
    }

    /** Rule 2: rollNo is unique, on create and on update. */
    public static ApiException rollNoTaken(String rollNo) {
        return new ApiException("Roll number " + rollNo + " already exists", HttpStatus.CONFLICT);
    }

    /** Rule 1: a receipt may never exceed the outstanding balance. */
    public static ApiException amountExceedsDue(long due) {
        return badRequest("Amount exceeds the outstanding due of " + money(due));
    }

    /** Rule 3: editing the fee structure must not drop it below what was paid. */
    public static ApiException totalBelowPaid(long paid) {
        return badRequest("Total fee cannot be lower than the " + money(paid) + " already collected");
    }

    public static ApiException badRequest(String message) {
        return new ApiException(message, HttpStatus.BAD_REQUEST);
    }

    /**
     * Whole rupees in the same en-IN grouping the UI uses, so a server message
     * reads like the ones the front-end writes itself ("₹1,23,000").
     */
    private static String money(long amount) {
        NumberFormat format = NumberFormat.getCurrencyInstance(Locale.of("en", "IN"));
        format.setMaximumFractionDigits(0);
        return format.format(amount);
    }
}
