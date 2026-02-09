# Multi-stage build for Spring Boot + React app
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Copy both frontend and backend
COPY backend/ backend/
COPY frontend/ frontend/

# Build the application (frontend-maven-plugin will handle React build)
WORKDIR /app/backend
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the built JAR from build stage
COPY --from=build /app/backend/target/*.jar app.jar

# Create directory for H2 database
RUN mkdir -p /app/data

# Expose Spring Boot port
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "app.jar"]
