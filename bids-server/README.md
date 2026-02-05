# Bids Server

This is the backend server for the Bids application, built with Spring Boot.

## Prerequisites

- Java 21
- Maven (wrapper included)

## Running the Server

You can run the server using the Maven wrapper:

```bash
./mvnw spring-boot:run
```

Or on Windows:

```cmd
.\mvnw spring-boot:run
```

The server will start on port `8080`.

## API Documentation (Swagger/OpenAPI)

The application uses SpringDoc OpenAPI to generate API documentation.

### Swagger UI

You can access the interactive Swagger UI at:

[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

This UI allows you to explore the API endpoints, see the request/response models, and try out the requests directly from the browser.

### OpenAPI JSON

The raw OpenAPI definition (JSON) is available at:

[http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

## H2 Console

The application uses an H2 database. You can access the console at:

[http://localhost:8080/h2-console](http://localhost:8080/h2-console)

- JDBC URL: `jdbc:h2:file:./data/auctiondb`
- User Name: `sa`
- Password: (empty)
