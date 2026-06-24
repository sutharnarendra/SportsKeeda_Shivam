# Stage 1: Build Stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application jar (skipping test phases for rapid containerization)
RUN mvn clean package -DskipTests

# Stage 2: Runtime Stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the packaged jar from the build stage
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Expose Spring Boot's Tomcat port
EXPOSE 8080

# Set default JVM options suited for the 12GB RAM Ampere shape
ENV JAVA_OPTS="-Xmx4g -Xms2g -XX:+UseZGC -XX:MaxMetaspaceSize=256m"

# Run with ZGC and support dynamic JAVA_OPTS environment variable overrides
ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS -jar app.jar" ]