package com.enrollx.fee;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Shared wiring for the API tests.
 *
 * <p>Each test runs in a transaction that rolls back, so the seeded demo data
 * is intact at the start of every test and order never matters.
 *
 * <p>MockMvc does not apply {@code server.servlet.context-path} on its own, so
 * every request declares it — the tests exercise the real "/api/..." paths.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
abstract class ApiTestSupport {

    protected static final String API = "/api";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper json;

    /** Declares the context path so "/api/students" dispatches as it does live. */
    protected static MockHttpServletRequestBuilder api(MockHttpServletRequestBuilder builder) {
        return builder.contextPath(API);
    }
}
