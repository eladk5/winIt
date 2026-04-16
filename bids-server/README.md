# Bids Server

This is the backend for the **winIt** auction platform, built with Spring Boot 3 and Java 21.

## Tech Stack

- **Framework**: Spring Boot 3 (Web, Security, JDBC, Validation)
- **Database**: H2 (Embedded file-based)
- **Language**: Java 21
- **API Documentation**: SpringDoc OpenAPI / Swagger

## Prerequisites

- **Java 21**
- **Maven** (optional, wrapper `./mvnw` or `mvnw.cmd` included)

## Running the Server

Start the application using the Maven wrapper:

```bash
# macOS / Linux
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

The server starts on port `8080` by default.

## API Documentation (Swagger)

The interactive Swagger UI allows you to explore and test API endpoints:

[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

The raw OpenAPI JSON is available at: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

## Database (H2 Console)

The application uses an embedded H2 database. You can access the console to inspect data:

[http://localhost:8080/h2-console](http://localhost:8080/h2-console)

- **JDBC URL**: `jdbc:h2:file:./data/auctiondb`
- **User Name**: `sa`
- **Password**: (empty)

*Note: The database schema is automatically initialized from `src/main/resources/schema.sql` on every startup.*

## Running Tests

Execute the unit and integration tests using Maven:

```bash
./mvnw test
```

## Project Structure

```
src/
├── main/
│   ├── java/com/example/bids_server/
│   │   ├── config/      # Security & Web configuration
│   │   ├── controller/  # REST endpoints (Auth, Bids, Products, Me)
│   │   ├── exception/   # Global error handling
│   │   ├── repository/  # Data access logic (JDBC)
│   │   ├── security/    # Authentication & Session management
│   │   └── service/     # Business logic
│   └── resources/
│       ├── application.properties # Core server configuration
│       └── schema.sql             # Database schema definition
└── test/
    └── java/com/example/bids_server/ # Automated tests
```
