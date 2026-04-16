# winIt - Real-time Bidding Marketplace

winIt is a full-stack auction platform that allows users to list products for sale and participate in real-time proxy bidding.

## 🚀 Quick Start (Local Development)

Follow these steps to get the entire project running on your local machine.

### 1. Prerequisites
- [**Java 21**](https://adoptium.net/temurin/releases/?version=21) – Required for the backend (Spring Boot).
- [**Node.js 20+**](https://nodejs.org/en/download/package-manager) (includes **npm**) – Required for the frontend (Next.js).

### 2. Start the Backend (Spring Boot)
Open a terminal and navigate to the server directory:
```bash
cd bids-server
# On macOS/Linux:
./mvnw spring-boot:run
# On Windows:
.\mvnw.cmd spring-boot:run
```
The server will start at `http://localhost:8080`.

### 3. Start the Frontend (Next.js)
Open a **new** terminal and navigate to the client directory:
```bash
cd bids-client

# 1. Install dependencies
npm install

# 2. Setup environment (minimal config)
# Create a .env.local file with the following content:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# 3. Start development server
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## 📖 Detailed Documentation

For more robust instructions, environment configuration, and technical details, please refer to the specific module documentation:

- [**Backend (Server) README**](./bids-server/README.md) – Covers API documentation (Swagger), H2 Database console, and project structure.
- [**Frontend (Client) README**](./bids-client/README.md) – Covers the Next.js tech stack, routing, and UI components.
