package com.collabeditor.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Configuration to serve React SPA and handle client-side routing.
 * Forwards all non-API, non-WebSocket routes to index.html.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static resources from /static/
        registry
            .addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requestedResource = location.createRelative(resourcePath);

                    // If the requested resource exists and is readable, serve it
                    if (requestedResource.exists() && requestedResource.isReadable()) {
                        return requestedResource;
                    }

                    // If the path starts with /api/ or /ws/, don't serve index.html
                    if (resourcePath.startsWith("api/") || resourcePath.startsWith("ws/")) {
                        return null;
                    }

                    // If the path has a file extension (like .js, .css, .png), don't serve index.html
                    if (resourcePath.contains(".")) {
                        return null;
                    }

                    // Otherwise, serve index.html for React Router
                    return new ClassPathResource("/static/index.html");
                }
            });
    }
}
