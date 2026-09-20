package com.enrollx.fee.common;

/**
 * The only shape a failed response ever takes:
 * <pre>{ "message": "Roll number FRS24001 already exists", "status": 409 }</pre>
 * The front-end reads {@code data.message} off every rejection.
 */
public record ErrorResponse(String message, int status) {
}
