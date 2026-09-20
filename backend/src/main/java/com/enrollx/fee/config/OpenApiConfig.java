package com.enrollx.fee.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

/**
 * Titles the Swagger page. Without this the UI reads "OpenAPI definition v1.0",
 * which tells an operator nothing about which service they are looking at.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI enrollxOpenApi() {
        return new OpenAPI().info(new Info()
                .title("EnrollX Fee API")
                .version("1.0.0")
                .description("Student fee registration and collection. "
                        + "All paths below are relative to the /api context path."));
    }
}
