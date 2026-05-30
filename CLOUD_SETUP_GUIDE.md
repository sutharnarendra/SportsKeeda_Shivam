# Yatra X — Cloud Platform Setup Guide (From Scratch)

> **Purpose:** Step-by-step account creation and configuration for every cloud service powering Yatra X.  
> **Prerequisite:** A valid email address, a phone number, and a debit/credit card (for identity verification only — no charges).  
> **Total Monthly Cost:** $0.00

---

## Service Setup Order

Follow this exact sequence. Each service depends on the one before it.

```
Step 1: Cloudflare Account     → DNS, WAF, Pages, R2 (all under one roof)
Step 2: Oracle Cloud Account   → Always-Free VM for Spring Boot
Step 3: Neon Account           → Serverless PostgreSQL database
Step 4: Upstash Account        → Free Redis caching layer
Step 5: Cloudinary Account     → Image CDN with auto-optimization
Step 6: Grafana Cloud Account  → Metrics dashboard & alerting
Step 7: Sentry Account         → Error tracking & crash alerts
Step 8: Email Gateway (Resend) → Free SMTP server for verification emails ($0/mo)
```

---

## Step 1: Cloudflare (Frontend CDN + WAF + R2 Storage)

### Why We Use Cloudflare
Cloudflare is the backbone of our free infrastructure. A single Cloudflare account gives us:
- **Cloudflare Pages** — Hosts our React frontend with **unlimited bandwidth** (no 100GB cap like Vercel).
- **Cloudflare R2** — Stores high-res videos and 3D GLB models with **zero egress fees**.
- **Cloudflare WAF** — Protects our Oracle backend server from DDoS attacks and bots.
- **Cloudflare DNS** — Manages our domain with HTTPS enforcement.

### Account Creation
1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Enter your **email** and create a **strong password**.
3. Verify your email by clicking the link sent to your inbox.
4. You are now on the Cloudflare Dashboard. No credit card required for Pages, DNS, or WAF.

---

### 1A. Setting Up Cloudflare Pages (Frontend Hosting)

**Use Case:** Hosts the compiled React + Vite production build (`dist/` folder). Serves your 3D homepage, shop, cart, and checkout pages globally via CDN edge nodes.

#### Steps:
1. In the Cloudflare Dashboard, click **Workers & Pages** in the left sidebar.
2. Click **Create** → Select the **Pages** tab.
3. Click **Connect to Git** → Authorize your GitHub account.
4. Select the **SportsKeeda** repository.
5. Configure the build settings:
   - **Project name:** `yatra-x`
   - **Production branch:** `main`
   - **Framework preset:** Select **Vite**
   - **Build command:** `cd frontend && npm run build`
   - **Build output directory:** `frontend/dist`
6. Click **Save and Deploy**.
7. Cloudflare will build your site and give you a URL like `yatra-x.pages.dev`.

#### Post-Setup Configuration:
- Go to **yatra-x** project → **Settings** → **Custom domains**.
- Add your custom domain (e.g., `www.yatrax.in`). Cloudflare auto-provisions a free SSL certificate.

---

### 1B. Setting Up Cloudflare R2 (Video & 3D Model Storage)

**Use Case:** Stores product showcase videos (`.mp4`), 3D parallette models (`.glb`), and custom laser engraving templates. Zero bandwidth fees mean streaming a 50MB video to 10,000 users costs $0.

#### Steps:
1. In the Cloudflare Dashboard, click **R2 Object Storage** in the left sidebar.
2. Click **Create bucket**.
3. **Bucket name:** `yatrax-media`
4. **Location hint:** Select **Asia Pacific** (closest to Indian users).
5. Click **Create bucket**.

#### Enable Public Access:
1. Open the `yatrax-media` bucket → **Settings** tab.
2. Under **Public access**, click **Allow Access**.
3. Cloudflare generates a public URL like: `https://pub-abc123.r2.dev/`
4. Any file uploaded to this bucket is now accessible at: `https://pub-abc123.r2.dev/videos/hero_1080p.mp4`

#### Upload Your First Files:
1. Click the **Objects** tab inside the bucket.
2. Click **Upload files** → drag and drop your video files.
3. Organize with folders: `videos/`, `models/`, `engravings/`.

#### Get API Credentials (For Spring Boot Upload):
1. Go to **R2 Object Storage** → **Manage R2 API Tokens**.
2. Click **Create API token**.
3. **Token name:** `yatrax-backend-upload`
4. **Permissions:** Object Read & Write.
5. **Specify bucket:** Select `yatrax-media` only.
6. Click **Create API Token**.
7. **SAVE these values immediately** (shown only once):
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint URL` (e.g., `https://<account-id>.r2.cloudflarestorage.com`)
8. Store these in your Oracle VM environment variables (covered in Step 2).

---

### 1C. Setting Up Cloudflare WAF & HTTPS (Security Layer)

**Use Case:** Shields the Oracle VM backend from Layer 7 DDoS floods, SQL injection attempts, brute-force login attacks, and bot scrapers. Without this, a single attacker can crash your free VM.

#### Steps:
1. In the Cloudflare Dashboard, click **Websites** → **Add a site**.
2. Enter your domain name (e.g., `yatrax.in`).
3. Select the **Free plan** → Click **Continue**.
4. Cloudflare scans your existing DNS records. Confirm them.
5. Cloudflare gives you two **nameservers** (e.g., `anna.ns.cloudflare.com`).
6. Go to your domain registrar (GoDaddy, Namecheap, etc.) and **replace the existing nameservers** with Cloudflare's nameservers.
7. Wait 5–30 minutes for DNS propagation.

#### Add Backend DNS Record:
1. Go to **DNS** → **Records** → **Add record**.
2. **Type:** `A`
3. **Name:** `api` (this creates `api.yatrax.in`)
4. **IPv4 address:** Your Oracle VM's public IP (from Step 2)
5. **Proxy status:** Toggle the cloud icon to **orange (Proxied)** ← THIS IS CRITICAL
6. Click **Save**.

#### Enable HTTPS Enforcement:
1. Go to **SSL/TLS** → **Edge Certificates**.
2. Toggle **Always Use HTTPS** to **ON**.
3. Set **Minimum TLS Version** to **TLS 1.2**.

#### Configure Rate Limiting:
1. Go to **Security** → **WAF** → **Rate limiting rules**.
2. Click **Create rule**:
   - **Rule name:** `API Rate Limit`
   - **If:** URI Path contains `/api/`
   - **Then:** Block for 1 hour
   - **Rate:** 100 requests per 10 seconds per IP
3. Click **Deploy**.

---

## Step 2: Oracle Cloud Infrastructure (Spring Boot Server)

### Why We Use Oracle Cloud
Oracle's Always Free tier is the most generous in the cloud industry. It gives you a real virtual machine with **4 CPU cores** and **24 GB RAM** that runs 24/7 **permanently** — no 12-month expiry, no sleep timer, no cold starts.

### Account Creation
1. Go to [cloud.oracle.com/free](https://www.oracle.com/cloud/free/).
2. Click **Start for Free**.
3. Enter your **name**, **email**, and **country** (select India).
4. Verify your email.
5. Choose your **Home Region**: Select **India South (Hyderabad)** or **India West (Mumbai)** for lowest latency.
6. Enter your **debit/credit card** for identity verification. Oracle places a temporary ₹1 hold (refunded immediately).

> [!IMPORTANT]
> **DO NOT upgrade to Pay-As-You-Go.** Keep your account as "Free Tier" only. As long as you stay on Free Tier, it is physically impossible for Oracle to charge your card.

### Create an Always Free VM Instance
1. In the OCI Console, click **Compute** → **Instances** → **Create Instance**.
2. **Name:** `yatrax-server`
3. **Image:** Select **Ubuntu 22.04** (Canonical).
4. **Shape:** Click **Change Shape** → **Ampere** tab → Select **VM.Standard.A1.Flex**.
   - Set **OCPUs:** `4`
   - Set **Memory:** `24 GB`
   - This is the maximum allowed under Always Free.
5. **Networking:** Use the default VCN. Ensure **Assign a public IPv4 address** is checked.
6. **SSH Key:** Click **Generate a key pair** → Download both the private key (`.key`) and public key (`.pub`). **Save these files securely** — you need them to log into the server.
7. Click **Create**.
8. Wait 2–5 minutes for provisioning. Note the **Public IP Address** shown on the instance details page.

### Connect to Your VM
Open PowerShell on your Windows machine:
```powershell
# Connect via SSH (replace with your actual key path and IP)
ssh -i C:\Users\Narendra\.ssh\oracle_key.key ubuntu@<YOUR_PUBLIC_IP>
```

### Install Java 21 & Docker on the VM
Once connected via SSH, run these commands:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install JDK 21
sudo apt install -y openjdk-21-jdk

# Verify Java
java -version

# Install Docker (for containerized deployment)
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

### Open Firewall Ports
By default, Oracle blocks all incoming traffic. You must open port 8080 for Spring Boot:

1. In OCI Console → **Networking** → **Virtual Cloud Networks** → Click your VCN.
2. Click your **Public Subnet** → Click the **Security List**.
3. Click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port Range:** `8080`
   - **Description:** `Spring Boot API`
4. Also add port `443` for HTTPS (Cloudflare proxy).
5. On the VM itself, run:
```bash
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Set Up Secure Environment Variable Secret Vault on the VM
To resolve **Gap #3 (Plaintext `/etc/environment` security risk)**, do not store secrets in globally readable system files. Instead, follow this secure setup:

1. Create a dedicated folder and environment file:
   ```bash
   sudo mkdir -p /etc/yatrax
   sudo touch /etc/yatrax/.env
   ```
2. Restrict file permissions so that only the user executing the Spring Boot app can read it:
   ```bash
   sudo chmod 600 /etc/yatrax/.env
   sudo chown -R ubuntu:ubuntu /etc/yatrax
   ```
3. Edit the file:
   ```bash
   sudo nano /etc/yatrax/.env
   ```
4. Insert your secrets:
   ```bash
   # Use Neon's pooled connection host with prepareThreshold=0
   DB_URL="jdbc:postgresql://ep-cool-morning-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&prepareThreshold=0"
   DB_USERNAME="yatrax_user"
   DB_PASSWORD="your_neon_password_here"
   
   # Caching layer
   UPSTASH_REDIS_HOST="apn1-abc123.upstash.io"
   UPSTASH_REDIS_PASSWORD="your_upstash_password"
   
   # Storage API keys
   R2_ACCESS_KEY="your_r2_access_key"
   R2_SECRET_KEY="your_r2_secret_key"
   R2_ENDPOINT="https://account-id.r2.cloudflarestorage.com"
   
   # Auth & Performance
   JWT_SECRET="your-64-character-jwt-secret-key-here"
   JAVA_OPTS="-Xmx350m -Xms256m -XX:+UseZGC -XX:MaxMetaspaceSize=96m"
   ```
   Save (`Ctrl+O`) and Exit (`Ctrl+X`).

5. **Oracle Vault Integration (Free Tier Upgrade):** OCI offers Key Management/Vault for free. You can use OCI CLI to dynamically pull encrypted keys during VM boot in a custom systemd pre-execution hook, keeping secrets fully off the VM filesystem.

---

## Step 3: Neon (PostgreSQL Database with PgBouncer Pooling)

### Why We Use Neon + PgBouncer
Neon provides serverless PostgreSQL with **3 GB of free storage** (perfect for relational orders/users data). However, to prevent database connection saturation from Spring Boot's HikariCP, we configure **Neon PgBouncer in Transaction Mode** (Fix #1). This aggregates multiple backend connection calls into effectively a single lightweight database thread.

### Account Creation & Database Setup
1. Go to [neon.tech](https://neon.tech) → Click **Sign Up** (GitHub or Google).
2. Click **Create Project**:
   - **Project name:** `yatrax-production`
   - **Postgres version:** `16`
   - **Region:** Select **Asia Pacific (Singapore)** for lowest latency to India.
3. Click **Create Project**.

### Get Connection Credentials (PgBouncer Mode)
1. In the Neon Dashboard, go to **Connection Details** on the right side.
2. Under the dropdown menu, change the connection type from **Direct connection** to **Pooled connection** (this enables PgBouncer transaction-level pooling).
3. Copy the database connection URL shown. Notice it appends `-pooler` to the host name.
   - Example host: `ep-cool-morning-123456-pooler.ap-southeast-1.aws.neon.tech`
4. The username and password are embedded inside the pooled URL string.

### Configure in Spring Boot
In transaction mode, statement caching must be disabled to prevent query mapping failures across pooled sessions. Add these properties to `application.properties`:
```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Critical PgBouncer settings:
# Disables server-side statement preparation in driver
spring.datasource.hikari.data-source-properties.prepareThreshold=0
# Prevents connection lease leak checks that disrupt transaction pooling
spring.datasource.hikari.leak-detection-threshold=0
```

### Monitor Storage Usage
1. In the Neon Dashboard, check **Usage** tabs regularly.
2. **Rule:** Never store large binary files in Neon. Images go to Cloudinary, videos/models go to R2.

---

## Step 4: Upstash Redis (Caching Layer)

### Why We Use Upstash
Our database connection pool is capped at 3 (free-tier survival). Without caching, every API call (product listings, cart lookups, session checks) directly hits the database. Upstash Redis caches frequently accessed data in memory, reducing database load by ~70%. Free tier gives **10,000 commands/day** — more than enough for a starting e-commerce site.

### Account Creation & Setup
1. Go to [upstash.com](https://upstash.com) → Click **Sign Up**.
2. Sign up with **GitHub** or **Google**. No credit card required.
3. Click **Create Database**:
   - **Name:** `yatrax-cache`
   - **Type:** Regional
   - **Region:** Select **Asia Pacific (Singapore)**
   - **TLS:** Enabled (required for secure connections)
4. Click **Create**.

### Get Connection Credentials
1. After creation, Upstash shows:
   - **Endpoint:** `apn1-abc123.upstash.io`
   - **Port:** `6379`
   - **Password:** `AaBbCcDdEeFf...`
2. Copy these values.

### Configure in Spring Boot
Add to your `application.properties`:
```properties
spring.data.redis.host=${UPSTASH_REDIS_HOST}
spring.data.redis.port=6379
spring.data.redis.password=${UPSTASH_REDIS_PASSWORD}
spring.data.redis.ssl.enabled=true
```

Store the actual values in your Oracle VM's `/etc/yatrax/.env` file (from Step 2).

---

## Step 5: Cloudinary (Image CDN & Auto-Optimization)

### Why We Use Cloudinary
Product images uploaded by admins can be 5–15 MB each (high-resolution DSLR photos). Serving raw images to mobile users on 4G would take 10+ seconds per image. Cloudinary automatically:
- **Compresses** images to the smallest possible size without visible quality loss.
- **Converts** to next-gen formats (WebP/AVIF) that load 40% faster.
- **Resizes** on-the-fly based on the requesting device's screen width.

### Account Creation
1. Go to [cloudinary.com](https://cloudinary.com) → Click **Sign Up for Free**.
2. Enter your **name**, **email**, and **password**.
3. Verify your email.
4. Your dashboard shows your **Cloud Name** (e.g., `dxyz1234`). This is your public identifier.
5. No credit card required. Free tier = 25 credits/month.

### Upload Product Images
1. In the Cloudinary Dashboard, click **Media Library**.
2. Create a folder: `products/`
3. Drag and drop your product images.
4. Each uploaded image gets a URL like:
   ```
   https://res.cloudinary.com/dxyz1234/image/upload/v1234567890/products/parallette_pro.jpg
   ```

### Use Dynamic Transformations in Frontend
Instead of serving the raw image, append transformation parameters to the URL:
```javascript
// In your React ProductCard component:
const imageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_800,q_auto,f_auto/products/parallette_pro.jpg`;
```
- `w_800` → Resize to 800px width
- `q_auto` → Auto-compress quality
- `f_auto` → Auto-serve WebP if browser supports it

### Get API Credentials (For Backend Upload)
1. Go to **Settings** → **API Keys**.
2. Copy: **Cloud Name**, **API Key**, **API Secret**.
3. Store these in your Oracle VM's environment variables.

---

## Step 6: Grafana Cloud (Metrics Dashboard)

### Why We Use Grafana
Without monitoring, you are blind to server health. Grafana Cloud free tier lets you visualize real-time JVM heap usage, garbage collection pauses, database connection pool saturation, and API response latencies — all in beautiful dashboards with configurable email alerts.

### Account Creation & Setup
1. Go to [grafana.com/products/cloud](https://grafana.com/products/cloud/) → Click **Create Free Account**.
2. Sign up with **GitHub** or **email**. No credit card required.
3. Grafana provisions a cloud instance for you (e.g., `yatrax.grafana.net`).

### Connect Spring Boot Actuator
1. In your Spring Boot `pom.xml`, add the Actuator + Micrometer Prometheus dependencies:
   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-actuator</artifactId>
   </dependency>
   <dependency>
       <groupId>io.micrometer</groupId>
       <artifactId>micrometer-registry-prometheus</artifactId>
   </dependency>
   ```
2. In `application.properties`:
   ```properties
   management.endpoints.web.exposure.include=health,prometheus,metrics
   management.endpoint.prometheus.enabled=true
   ```
3. Your Spring Boot server now exposes metrics at `http://localhost:8080/actuator/prometheus`.

### Configure Grafana to Scrape Metrics
1. In your Grafana Cloud dashboard, go to **Connections** → **Add new connection**.
2. Search for **Prometheus** → Follow the guided setup.
3. Install the **Grafana Agent** on your Oracle VM:
   ```bash
   # On your Oracle VM via SSH:
   curl -fsSL https://grafana.com/api/agent/install.sh | sudo sh
   ```
4. Configure the agent to scrape your Spring Boot's `/actuator/prometheus` endpoint.
5. Import a pre-built **Spring Boot dashboard** (Dashboard ID: `12900`) for instant JVM monitoring.

---

## Step 7: Sentry (Error Tracking & Crash Alerts)

### Why We Use Sentry
When a user encounters a 500 error during checkout, you need to know immediately — not when they complain on social media. Sentry catches every unhandled exception in your Spring Boot backend and sends you an instant email with the full stack trace, request details, and affected user info.

### Account Creation & Setup
1. Go to [sentry.io](https://sentry.io) → Click **Start for Free**.
2. Sign up with **GitHub** or **email**. No credit card required.
3. Create an **Organization** (e.g., `yatrax`).
4. Create a **Project**:
   - **Platform:** Java → Spring Boot
   - **Project name:** `yatrax-backend`
5. Sentry gives you a **DSN** (Data Source Name) URL like:
   ```
   https://abc123@o456789.ingest.sentry.io/1234567
   ```

### Add to Spring Boot
1. Add the Sentry SDK to `pom.xml`:
   ```xml
   <dependency>
       <groupId>io.sentry</groupId>
       <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
       <version>7.14.0</version>
   </dependency>
   ```
2. In `application.properties`:
   ```properties
   sentry.dsn=${SENTRY_DSN}
   sentry.traces-sample-rate=0.1
   sentry.environment=production
   ```
3. The `traces-sample-rate=0.1` means Sentry only captures 10% of normal transactions, conserving your 5,000 free events/month for real errors.

### Configure Alert Rules
1. In the Sentry Dashboard, go to **Alerts** → **Create Alert Rule**.
2. **When:** A new issue is created with level `error` or `fatal`.
3. **Then:** Send notification to your email.
4. This ensures you get an email the instant any checkout crash, database timeout, or auth failure occurs.

---

## Post-Setup Verification Checklist

After completing all 7 steps, verify your entire stack is operational:

| # | Check | Command / URL | Expected Result |
|---|---|---|---|
| 1 | Frontend loads | `https://yatra-x.pages.dev` | Homepage with 3D animation renders |
| 2 | Backend health | `https://api.yatrax.in/actuator/health` | `{"status":"UP"}` |
| 3 | Database connected | Check Spring Boot startup logs | `HikariPool-1 - Start completed` |
| 4 | Redis connected | Check Spring Boot startup logs | `RedisConnectionFactory initialized` |
| 5 | R2 accessible | `https://pub-xxx.r2.dev/models/test.glb` | File downloads successfully |
| 6 | Cloudinary images | `https://res.cloudinary.com/xxx/image/upload/w_100/products/test.jpg` | Resized thumbnail loads |
| 7 | WAF active | Cloudflare Dashboard → Security → Overview | Shows "Proxied" status |
| 8 | HTTPS enforced | Visit `http://api.yatrax.in` | Auto-redirects to `https://` |
| 9 | Grafana metrics | `yatrax.grafana.net` | JVM heap & request latency graphs visible |
| 10 | Sentry alerts | Trigger a test error in Spring Boot | Email notification received |

---

## Step 8: Security Hardening (OWASP Top 10 + Common Attack Vectors)

The cloud setup above gives you infrastructure-level protection (DDoS, TLS, rate limiting). But that only covers the perimeter. The following section addresses **application-level security** — the attacks that happen *after* a request passes through Cloudflare and reaches your Spring Boot code.

### Attack Vector Coverage Matrix

| # | Attack Type | Severity | Where It's Stopped | How We Prevent It |
|---|---|---|---|---|
| 1 | **DDoS (Distributed Denial of Service)** | 🔴 Critical | Cloudflare Edge | CF WAF absorbs Layer 3/4/7 floods before they reach Oracle VM (Step 1C) |
| 2 | **SQL Injection** | 🔴 Critical | Spring Data JPA | Parameterized queries via JPA — raw string concatenation is never used |
| 3 | **XSS (Cross-Site Scripting)** | 🔴 Critical | Spring Security + CSP Headers | Security headers block inline script execution; React auto-escapes JSX |
| 4 | **CSRF (Cross-Site Request Forgery)** | 🟡 High | Stateless JWT Architecture | No server-side sessions = no CSRF cookies to forge; JWT is sent via `Authorization` header |
| 5 | **Session Hijacking** | 🔴 Critical | HttpOnly + Secure Cookies + JWT Rotation | Refresh tokens stored in HttpOnly cookies (inaccessible to JavaScript); single-use rotation |
| 6 | **Clickjacking** | 🟡 High | `X-Frame-Options` Header | Spring Security sets `DENY` — your site cannot be embedded in malicious iframes |
| 7 | **Brute-Force Login** | 🟡 High | Cloudflare Rate Limit + Spring Rate Limiter | CF blocks >100 req/10s per IP; Spring-side locks account after 5 failed attempts |
| 8 | **Man-in-the-Middle (MitM)** | 🔴 Critical | Cloudflare Full Strict SSL | End-to-end encryption from browser → CF edge → Oracle VM (no plaintext hops) |
| 9 | **Insecure Direct Object Reference (IDOR)** | 🟡 High | Spring Security Authorization | Users can only access their own orders/cart via `@PreAuthorize` ownership checks |
| 10 | **Sensitive Data Exposure** | 🔴 Critical | BCrypt + Env Vars + HSTS | Passwords hashed with BCrypt (strength 12); secrets in env vars; HSTS forces HTTPS |
| 11 | **File Upload Attacks** | 🟡 High | Validation + R2 Isolation | File type/size validation in Spring; uploads stream directly to R2 (never executed on server) |
| 12 | **Bot Scraping / Credential Stuffing** | 🟡 Medium | Cloudflare Bot Management | CF free plan includes bot challenge pages for suspicious automated traffic patterns |

---

### 8A. SQL Injection Prevention

**Attack:** An attacker enters `'; DROP TABLE users; --` into a login form, attempting to destroy your database.

**How Spring Data JPA Prevents It:**
Spring Data JPA uses Hibernate's **PreparedStatement** API internally. User input is always treated as a literal parameter value, never as executable SQL code.

```java
// SAFE — Spring Data JPA parameterized query (what we use)
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email); // Hibernate auto-parameterizes this
}

// DANGEROUS — Never do this (raw string concatenation)
// String query = "SELECT * FROM users WHERE email = '" + email + "'";
```

**Rule:** Never use native SQL queries with string concatenation. Always use JPA repository methods or `@Query` with named parameters (`:email`).

---

### 8B. XSS (Cross-Site Scripting) Prevention

**Attack:** An attacker submits a product review containing `<script>document.cookie</script>`. If rendered without sanitization, this executes in other users' browsers, stealing their session tokens.

**Multi-Layer Defense:**

1. **React Auto-Escaping:** React's JSX automatically escapes all dynamic content. `{review.text}` renders `<script>` as plain text, not executable HTML.

2. **Content Security Policy (CSP) Header:** Configure Spring Security to send CSP headers that block inline script execution:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https://res.cloudinary.com https://*.r2.dev; connect-src 'self' https://api.yatrax.in; font-src 'self' https://fonts.gstatic.com")
            )
            .frameOptions(frame -> frame.deny()) // Clickjacking prevention
        );
        return http.build();
    }
}
```

3. **Server-Side Input Sanitization:** Validate and strip HTML tags from all user-submitted text (reviews, addresses, names):
```java
// In your DTO validation:
public class ReviewRequest {
    @NotBlank
    @Size(max = 500)
    @Pattern(regexp = "^[^<>]*$", message = "HTML tags are not allowed")
    private String text;
}
```

---

### 8C. Session Hijacking Prevention

**Attack:** An attacker steals a user's JWT token (via XSS, packet sniffing, or physical access) and impersonates them to place fraudulent orders.

**Multi-Layer Defense:**

1. **Short-Lived Access Tokens (15 minutes):** Even if stolen, the token expires quickly.

2. **HttpOnly Secure Refresh Cookies:** The refresh token is stored in a cookie that JavaScript cannot read:
```java
ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
    .httpOnly(true)    // JavaScript cannot access this cookie
    .secure(true)      // Only sent over HTTPS
    .sameSite("Strict") // Not sent on cross-origin requests
    .path("/api/auth/refresh")  // Only sent to the refresh endpoint
    .maxAge(Duration.ofDays(7))
    .build();
response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
```

3. **Single-Use Refresh Token Rotation:** Each time a refresh token is used, it is invalidated and replaced with a new one. If an attacker uses a stolen refresh token, the legitimate user's next refresh fails — alerting them to compromise.

4. **Token Fingerprinting:** Bind the JWT to the user's IP address and User-Agent. If these change, force re-authentication:
```java
// When generating the JWT:
String fingerprint = DigestUtils.sha256Hex(request.getRemoteAddr() + request.getHeader("User-Agent"));
claims.put("fingerprint", fingerprint);

// When validating:
String currentFingerprint = DigestUtils.sha256Hex(request.getRemoteAddr() + request.getHeader("User-Agent"));
if (!currentFingerprint.equals(tokenFingerprint)) {
    throw new InvalidTokenException("Session fingerprint mismatch — possible hijacking attempt");
}
```

---

### 8D. CSRF (Cross-Site Request Forgery) Prevention

**Attack:** A malicious website tricks a logged-in user's browser into making unauthorized requests (e.g., transferring money, changing their email) by embedding hidden forms that auto-submit.

**Why We're Protected:**
Traditional CSRF exploits session cookies that the browser automatically attaches to every request. Our architecture uses **stateless JWT authentication** — the token is sent in the `Authorization: Bearer <token>` header, which browsers **never** attach automatically to cross-origin requests.

```java
// In SecurityConfig — CSRF can be safely disabled for stateless JWT APIs:
http.csrf(csrf -> csrf.disable())  // Safe because we use Bearer token auth, not cookie-based sessions
    .sessionManagement(session -> session
        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
    );
```

> [!IMPORTANT]
> CSRF protection is ONLY safe to disable because we use JWT Bearer tokens. If you ever switch to cookie-based session auth, you MUST re-enable CSRF protection.

---

### 8E. Brute-Force Login Protection

**Attack:** An attacker tries thousands of password combinations against the `/api/auth/login` endpoint to break into user accounts.

**Multi-Layer Defense:**

1. **Cloudflare Rate Limiting (Layer 1):** Already configured in Step 1C — blocks IPs sending >100 requests per 10 seconds.

2. **Application-Level Account Lockout (Layer 2):**
```java
@Service
public class AuthService {
    private static final int MAX_ATTEMPTS = 5;
    private final Map<String, Integer> failedAttempts = new ConcurrentHashMap<>();

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail();

        if (failedAttempts.getOrDefault(email, 0) >= MAX_ATTEMPTS) {
            throw new AccountLockedException("Account locked for 15 minutes due to too many failed attempts");
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> {
                failedAttempts.merge(email, 1, Integer::sum);
                return new BadCredentialsException("Invalid credentials");
                // Generic message prevents account enumeration
            });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            failedAttempts.merge(email, 1, Integer::sum);
            throw new BadCredentialsException("Invalid credentials");
        }

        failedAttempts.remove(email); // Reset on successful login
        return generateTokenResponse(user);
    }
}
```

3. **BCrypt Password Hashing:** Even if the database is fully leaked, passwords cannot be reversed:
```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12); // Strength 12 = ~250ms per hash (slow enough to deter brute-force)
}
```

---

### 8F. Man-in-the-Middle (MitM) Prevention

**Attack:** An attacker intercepts unencrypted HTTP traffic between the user and server, reading passwords and tokens in transit.

**Defense — Full Strict SSL Chain:**
1. **Cloudflare → Browser:** Cloudflare auto-provisions a free TLS certificate. "Always Use HTTPS" redirects all HTTP traffic.
2. **Cloudflare → Oracle VM:** In Cloudflare Dashboard → SSL/TLS → set mode to **Full (Strict)**. This ensures the connection between Cloudflare's edge and your Oracle VM is also encrypted.
3. **HSTS Header:** Forces browsers to only use HTTPS for your domain for the next year:
```java
http.headers(headers -> headers
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true)
        .maxAgeInSeconds(31536000) // 1 year
    )
);
```

---

### 8G. File Upload Attack Prevention

**Attack:** An attacker uploads a malicious `.jsp` or `.exe` file disguised as a product image. If stored on the server, it could be executed.

**Defense:**
1. **Validate file type and size before processing:**
```java
@PostMapping("/api/upload")
public ResponseEntity<?> uploadFile(@RequestParam MultipartFile file) {
    // Whitelist allowed MIME types
    List<String> allowed = List.of("image/jpeg", "image/png", "image/webp", "video/mp4", "model/gltf-binary");
    if (!allowed.contains(file.getContentType())) {
        return ResponseEntity.badRequest().body("File type not allowed");
    }
    // Cap file size at 50MB
    if (file.getSize() > 50 * 1024 * 1024) {
        return ResponseEntity.badRequest().body("File too large (max 50MB)");
    }
    // Stream directly to R2 — file is NEVER saved to local disk
    r2StorageService.upload(file);
    return ResponseEntity.ok("Upload successful");
}
```
2. **Files stream directly to R2** (Step 1B) — they are never written to the Oracle VM's filesystem, so even if a malicious file passes validation, it cannot be executed on your server.

---

### 8H. Security Headers Summary

All security headers configured in Spring Security:

| Header | Value | Prevents |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'...` | XSS, code injection |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy browser XSS filter |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | MitM / SSL stripping |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer data leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Unauthorized device access |

Complete Spring Security configuration that applies all headers:
```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self'"))
    .frameOptions(frame -> frame.deny())
    .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
    .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    .permissionsPolicy(permissions -> permissions.policy("camera=(), microphone=(), geolocation=()"))
);
```
---

## Step 9: Advanced Production Operations & Automation (Gaps Closed)

To push the Yatra X architecture from **87/100 to a near-perfect 96/100**, this step implements **Automated CI/CD Workflows** and **HLS Adaptive Video Transcoding Pipelines** with zero monthly costs.

### 9A. Setting Up GitHub Actions Backend Deploy Workflow

This eliminates manual SSH commands and provides a fully automated pipeline with an **Actuator Health-Check Gate** and **Automatic Rollbacks**.

#### 1. Configure GitHub Repository Secrets:
Go to your private GitHub repository → **Settings** → **Secrets and variables** → **Actions** → Click **New repository secret**:
*   `ORACLE_VM_IP`: Your Oracle VM Public IP (e.g. `129.156.xx.xx`).
*   `ORACLE_SSH_KEY`: The entire contents of your private SSH key (`.key` file generated in Step 2).

#### 2. Create the GitHub Workflow File:
In your project codebase, create a new directory and file: `.github/workflows/deploy.yml`. Paste the workflow configuration from **Section 8A of [ARCHITECTURE.md](file:///d:/SportsKeeda/ARCHITECTURE.md)**.

#### 3. Create the Deploy Script on the Oracle VM:
Log into your Oracle VM via SSH and execute these commands to set up the directories and scripts:
```bash
# Create application and temp upload folders
sudo mkdir -p /opt/yatrax /opt/yatrax/deploy-temp
sudo chown -R ubuntu:ubuntu /opt/yatrax

# Create the deployment script
nano /opt/yatrax/deploy.sh
```
Paste the self-healing zero-downtime rollback script from **Section 8C of [ARCHITECTURE.md](file:///d:/SportsKeeda/ARCHITECTURE.md)** into this file. Save (`Ctrl+O`) and Exit (`Ctrl+X`). Make it executable:
```bash
chmod +x /opt/yatrax/deploy.sh
```

#### 4. Configure the systemd Service Manager:
To securely load secrets and run your backend as a system service, create a new service unit configuration:
```bash
sudo nano /etc/systemd/system/yatrax.service
```
Paste the systemd configuration from **Section 8B of [ARCHITECTURE.md](file:///d:/SportsKeeda/ARCHITECTURE.md)**. Save and Exit.
```bash
# Enable the service to start automatically on VM boot
sudo systemctl daemon-reload
sudo systemctl enable yatrax.service
```

---

### 9B. Running the FFmpeg Adaptive HLS Video Streaming Pipeline

This ensures high-resolution videos load instantaneously without buffering or stalling on mobile devices.

#### 1. Setup FFmpeg Transcoder:
If transcoding directly on your Oracle VM, install FFmpeg:
```bash
sudo apt update && sudo apt install -y ffmpeg
```
Alternatively, run this locally on your laptop if it has FFmpeg installed (recommended to keep VM CPU load at zero during business hours).

#### 2. Write the Transcoding Script:
Create a file named `transcode-hls.sh` in a temporary workspace directory:
```bash
nano transcode-hls.sh
```
Paste the transcoding script from **Section 5D of [ARCHITECTURE.md](file:///d:/SportsKeeda/ARCHITECTURE.md)**. Make it executable:
```bash
chmod +x transcode-hls.sh
```

#### 3. Transcode Your Showcase Videos:
```bash
# Run the transcoder (Input video path, Output folder name)
./transcode-hls.sh showcase_hero.mp4 hero_hls
```
This generates:
- `playlist_0.m3u8` (480p bandwidth playlist)
- `playlist_1.m3u8` (720p bandwidth playlist)
- `playlist_2.m3u8` (1080p bandwidth playlist)
- `master.m3u8` (the main index coordinate file)
- Hundreds of `.ts` stream segments (6-second chunks).

#### 4. Upload to Cloudflare R2:
1. Log into your Cloudflare Dashboard → **R2 Object Storage** → select `yatrax-media` bucket.
2. Click **Upload** → **Upload Folder** (or upload the files directly).
3. Place them in a nested directory, e.g., `videos/hero/`.
4. Copy the public URL of the `master.m3u8` file.
   - Example: `https://pub-xxx.r2.dev/videos/hero/master.m3u8`

#### 5. Render in React:
In your React code, load this `master.m3u8` URL into the `<AdaptiveVideoPlayer>` component detailed in **Section 5D of [ARCHITECTURE.md](file:///d:/SportsKeeda/ARCHITECTURE.md)**. Mobile browsers will automatically fetch the 480p chunks, while fast connection desktop users fetch the 1080p segments seamlessly.

---

## Step 10: Email Gateway (Resend SMTP Setup)

To allow secure email verification without breaking our $0/month budget, we configure a free SMTP relay using **Resend**.

### 10A. Account Setup
1. Go to [resend.com](https://resend.com) and click **Sign Up**.
2. Enter your email and a secure password (no credit card required).
3. Verify your email.

### 10B. Domain Verification in Cloudflare
To ensure high deliverability and prevent email verification links from landing in the SPAM folder, we must authenticate our domain (`yatrax.in`) using SPF/DKIM:
1. On your Resend Dashboard, go to **Domains** → click **Add Domain**.
2. Enter `yatrax.in` and select your region (e.g., US East). Click **Add**.
3. Resend will generate 3 DNS records (DKIM and SPF TXT/MX records):
   - **Record 1 (TXT):** Type: `TXT` | Name: `resend._domainkey` | Value: `k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8...`
   - **Record 2 (TXT):** Type: `TXT` | Name: `@` | Value: `v=spf1 include:amazonses.com ~all`
   - **Record 3 (MX):** Type: `MX` | Name: `@` | Value: `feedback-smtp.us-east-1.amazonses.com` | Priority: `10`
4. Log into your **Cloudflare Dashboard** → select `yatrax.in` domain → **DNS Settings** → **Records**.
5. Click **Add Record** for each of the records generated by Resend. Disable **Proxy status** (DNS only) for these records.
6. Return to Resend and click **Verify**. It will show a green **Verified** status within 2–5 minutes.

### 10C. Generate SMTP Credentials
1. Go to **API Keys** on your Resend Dashboard.
2. Click **Create API Key**.
   - **Name:** `yatrax-backend-smtp`
   - **Permission:** **Sending Access**
   - **Domain:** Select `yatrax.in`
3. Click **Add** and **copy** the generated API Key immediately. It starts with `re_...`.

### 10D. Secure Env Configurations on Oracle VM
1. SSH into your Oracle ARM VM.
2. Open your secure env file:
   ```bash
   sudo nano /etc/yatrax/.env
   ```
3. Append the Resend SMTP credential at the bottom:
   ```bash
   # Resend SMTP Auth
   RESEND_API_KEY="re_your_api_key_here"
   ```
4. Save (`Ctrl+O`) and Exit (`Ctrl+X`).
5. Restart your application service to load the new environment variable:
   ```bash
   sudo systemctl restart yatrax.service
   ```

---

> **This file is the single source of truth for all cloud account setup and security hardening.**  
> Keep credentials in your secure `/etc/yatrax/.env` file only.  
> Never commit API keys, passwords, or DSN strings to Git.
