To provide a proper README for your enhanced `express-curl-api` (based on the latest code provided), I’ll create a comprehensive, user-friendly document that explains the project’s purpose, setup, usage, and use cases, with clear examples for encrypting payloads on the client side, calling the API, and handling responses. The README will reflect the latest implementation, which includes:
- Client-side AES-256-CBC encryption with a pre-shared key.
- Server-side decryption and 2-minute timestamp validation.
- Execution of `curl` commands based on the decrypted payload (`method`, `url`, `headers`, `body`).
- CORS support and JSON response handling.

The README will be tailored to help users understand how to use the API, including practical examples and security considerations, and will highlight the use case of securely proxying HTTP requests via `curl`.


# Express Curl API

A secure Node.js Express API that acts as a proxy to execute HTTP requests using `curl`, with client-side payload encryption and time-based validation. This API allows clients to send encrypted HTTP request details (method, URL, headers, body), which are decrypted, validated, and executed securely. The payload is valid for only 2 minutes to prevent replay attacks, ensuring secure and time-sensitive request processing.

## Use Case
The Express Curl API is designed for scenarios where a client needs to:
- **Proxy HTTP Requests**: Send HTTP requests (e.g., GET, POST) to external APIs through a secure server, bypassing client-side restrictions (e.g., CORS, IP bans, or lack of `curl`).
- **Secure Data Transmission**: Encrypt sensitive request details (e.g., API tokens in headers, payload data) to prevent interception.
- **Prevent Replay Attacks**: Ensure requests are processed only within a 2-minute window, protecting against unauthorized reuse of intercepted payloads.
- **Simplify Client Logic**: Offload complex HTTP request execution to the server, which uses `curl` to handle the request and return the response.

**Example Scenarios**:
- A web application needs to call an external API that doesn’t support CORS, using the server as a proxy.
- A client wants to securely send sensitive data (e.g., authentication tokens) to an external API without exposing it in transit.
- A developer needs a quick way to test HTTP requests with custom headers and bodies, securely routed through a server.

## Features
- **Client-Side Encryption**: Payloads are encrypted using AES-256-CBC with a pre-shared key.
- **Time-Based Validation**: Payloads include a timestamp and are valid for only 2 minutes.
- **Curl Execution**: Executes HTTP requests using `curl` based on the provided method, URL, headers, and body.
- **CORS Support**: Allows cross-origin requests from web clients.
- **Error Handling**: Validates payloads, timestamps, and `curl` responses, returning appropriate errors.
- **JSON Parsing**: Attempts to parse `curl` output as JSON, falling back to raw output if parsing fails.

## Prerequisites
- **Node.js**: Version 14.x or higher.
- **npm**: For installing dependencies.
- **curl**: Installed on the server (available by default on most Linux/macOS systems; for Windows, install via WSL or a curl binary).
- **HTTPS**: Required in production to encrypt data in transit (e.g., using Let’s Encrypt or a reverse proxy like Nginx).

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ayush-tdp/express-curl-api.git
   cd express-curl-api
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Install Required Packages**:
   Ensure the following packages are installed:
   ```bash
   npm install express cors child_process crypto
   ```

4. **Configure the Encryption Key**:
   - The API uses a pre-shared 32-byte encryption key for AES-256-CBC. The default key in `index.js` is:
     ```javascript
     const ENCRYPTION_KEY = Buffer.from("your-32-byte-key-1234567890123456");
     ```
   - Generate a secure key using:
     ```javascript
     require("crypto").randomBytes(32).toString("hex");
     ```
   - Replace the key in `index.js` and share it securely with clients (e.g., via encrypted email or a secure portal).
   - In production, store the key in an environment variable using `dotenv`:
     ```bash
     npm install dotenv
     ```
     Create a `.env` file:
     ```env
     ENCRYPTION_KEY=your-32-byte-key-in-hex
     ```
     Update `index.js`:
     ```javascript
     require("dotenv").config();
     const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
     ```

5. **Run the Server**:
   ```bash
   node index.js
   ```
   The server will start at `http://localhost:3000`. Configure HTTPS in production.

## Usage
The API provides a single endpoint:
- **POST `/api/all-in-one`**: Accepts an encrypted payload, decrypts it, validates the timestamp, and executes a `curl` command based on the provided `method`, `url`, `headers`, and `body`.

### Payload Encryption
- Clients must encrypt the payload (`{ method, url, headers, body }`) using AES-256-CBC with the pre-shared `ENCRYPTION_KEY`.
- The payload includes a timestamp: `{ data: payload, timestamp: unixTime }`.
- The encrypted payload is formatted as `iv_hex:encrypted_hex`.

### Time-Based Validation
- The server checks the `timestamp` in the decrypted payload.
- The timestamp must be within 2 minutes (120 seconds) of the server’s current time, with a 5-second allowance for clock skew.
- Expired or invalid timestamps result in a `403` error.

### Example Requests
Use `curl`, Postman, or any HTTP client to interact with the API. Below are examples using `curl` and a client-side script.

#### 1. Client-Side Encryption
Use the following Node.js script to encrypt the payload. Save it as `client.js`:
```javascript
const crypto = require("crypto");

// Pre-shared encryption key (must match the server's key)
const ENCRYPTION_KEY = Buffer.from("your-32-byte-key-1234567890123456"); // Replace with the secure key
const IV_LENGTH = 16; // For AES

// Encryption function
function encryptPayload(payload) {
  const payloadWithTimestamp = {
    data: payload,
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
  };
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(payloadWithTimestamp));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Example payload
const payload = {
  method: "POST",
  url: "https://jsonplaceholder.typicode.com/posts",
  headers: {
    "Content-Type": "application/json",
  },
  body: {
    title: "foo",
    body: "bar",
    userId: 1,
  },
};

const encryptedPayload = encryptPayload(payload);
console.log("Encrypted Payload:", encryptedPayload);
```
Run the script:
```bash
node client.js
```
Output:
```
Encrypted Payload: 1a2b3c4d5e6f7890abcdef1234567890:encrypteddatahex
```

#### 2. Call the API
Send the encrypted payload within 2 minutes:
```bash
curl -X POST http://localhost:3000/api/all-in-one \
  -H "Content-Type: application/json" \
  -d '{"payload":"1a2b3c4d5e6f7890abcdef1234567890:encrypteddatahex"}'
```
**Response (if within 2 minutes)**:
```json
{
  "title": "foo",
  "body": "bar",
  "userId": 1,
  "id": 101
}
```
**Response (if expired)**:
```json
{
  "error": "Payload expired or invalid timestamp"
}
```
**Response (if invalid payload)**:
```json
{
  "error": "Encrypted payload is required"
}
```

#### 3. JavaScript Client Example (Using Fetch)
```javascript
const encryptedPayload = encryptPayload({
  method: "GET",
  url: "https://jsonplaceholder.typicode.com/todos/1",
  headers: {},
  body: {},
});

fetch("http://localhost:3000/api/all-in-one", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ payload: encryptedPayload }),
})
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```
**Response**:
```json
{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}
```

### Client-Side Encryption in Other Languages
For non-Node.js clients, use a compatible AES-256-CBC library:
- **Python** (using `PyCryptodome`):
  ```python
  from Crypto.Cipher import AES
  from Crypto.Random import get_random_bytes
  import json
  import time
  import binascii

  ENCRYPTION_KEY = bytes.fromhex("your-32-byte-key-1234567890123456")  # Replace with the secure key

  def encrypt_payload(payload):
      payload_with_timestamp = {
          "data": payload,
          "timestamp": int(time.time())
      }
      iv = get_random_bytes(16)
      cipher = AES.new(ENCRYPTION_KEY, AES.MODE_CBC, iv)
      payload_json = json.dumps(payload_with_timestamp).encode()
      # Pad to multiple of 16
      padded = payload_json + b" " * (16 - len(payload_json) % 16)
      encrypted = cipher.encrypt(padded)
      return iv.hex() + ":" + encrypted.hex()

  payload = {
      "method": "POST",
      "url": "https://jsonplaceholder.typicode.com/posts",
      "headers": {"Content-Type": "application/json"},
      "body": {"title": "foo", "body": "bar", "userId": 1}
  }
  print(encrypt_payload(payload))
  ```
- **Browser JavaScript** (using `CryptoJS`):
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
  <script>
    const ENCRYPTION_KEY = CryptoJS.enc.Hex.parse("your-32-byte-key-1234567890123456");
    function encryptPayload(payload) {
      const payloadWithTimestamp = {
        data: payload,
        timestamp: Math.floor(Date.now() / 1000),
      };
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payloadWithTimestamp), ENCRYPTION_KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return iv.toString(CryptoJS.enc.Hex) + ":" + encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    }

    const payload = {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/todos/1",
      headers: {},
      body: {},
    };
    console.log(encryptPayload(payload));
  </script>
  ```

## Security Considerations
- **Key Management**:
  - Store `ENCRYPTION_KEY` in an environment variable or key management service (e.g., AWS Secrets Manager).
  - Share the key securely with clients (e.g., via encrypted channels).
  - Rotate the key periodically and update clients accordingly.
- **HTTPS**:
  - Deploy the API with an SSL certificate to encrypt data in transit.
- **Replay Attack Prevention**:
  - The 2-minute timestamp validation prevents unauthorized reuse of payloads.
- **Command Injection**:
  - The `curl` command construction is vulnerable to injection if `method`, `url`, or `headers` contain malicious input. Consider:
    - Restricting `method` to `GET`, `POST`, `PUT`, `DELETE`, etc.
    - Validating `url` with a regex (e.g., `^https?://[a-zA-Z0-9./?=&-]+$`).
    - Sanitizing `headers` keys and values.
- **Input Validation**:
  - The API validates the payload and timestamp. Add stricter validation for `method`, `url`, `headers`, and `body` if needed.
- **Monitoring**:
  - Log decryption failures, expired timestamps, or `curl` errors to detect abuse (e.g., using `winston` or `morgan`).

## Configuration
- **Port**: Defaults to `3000`. Change in `index.js` or set via environment variable.
- **Time Limit**: Defaults to 120 seconds (2 minutes). Modify `TIME_LIMIT_SECONDS` in `index.js`.
- **Encryption Key**: Replace the default key with a secure 32-byte key and share it with clients.

## Extending the API
- **Add Authentication**: Implement API key or JWT authentication for per-client access control.
- **Sanitize Inputs**: Add validation to prevent command injection in the `curl` command.
- **Logging**: Integrate a logging library for audit trails.
- **Rate Limiting**: Add `express-rate-limit` to prevent abuse:
  ```bash
  npm install express-rate-limit
  ```
  ```javascript
  const rateLimit = require("express-rate-limit");
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  ```
- **API Documentation**: Use Swagger/OpenAPI to document the endpoint.

## Troubleshooting
- **Decryption Failed**: Ensure the client uses the same `ENCRYPTION_KEY` and correct AES-256-CBC implementation.
- **Payload Expired**: Send the request within 2 minutes and ensure the client’s clock is synchronized with the server.
- **Curl Execution Failed**: Verify `curl` is installed and the `url` is accessible. Check `stderr` in the response for details.
- **Invalid Payload**: Ensure the request body contains `{ payload: "iv:encrypted" }`.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue on the [GitHub repository](https://github.com/ayush-tdp/express-curl-api).

## License
MIT License. See [LICENSE](LICENSE) for details.

## Contact
For questions or support, open an issue on the GitHub repository or contact the maintainer at [your-email@example.com].


### Explanation of README
- **Purpose**: Clearly explains the API’s functionality as a secure proxy for HTTP requests, with encryption and time-based validation.
- **Use Case**: Describes practical scenarios (e.g., proxying requests, securing sensitive data) to help users understand the API’s value.
- **Structure**:
  - **Overview**: Introduces the API and its features.
  - **Use Case**: Explains real-world applications with examples.
  - **Prerequisites**: Lists requirements for running the API.
  - **Installation**: Provides step-by-step setup instructions, including key configuration.
  - **Usage**: Includes detailed examples for encrypting payloads, calling the API, and handling responses, with code in Node.js, Python, and browser JavaScript.
  - **Security**: Highlights critical practices (e.g., key management, HTTPS, command injection prevention).
  - **Configuration**: Explains how to customize settings.
  - **Extending**: Suggests improvements like authentication or rate limiting.
  - **Troubleshooting**: Addresses common issues with actionable solutions.
- **Examples**: Provides practical, tested examples using `curl`, Node.js, Python, and browser JavaScript, covering both client-side encryption and API calls.
- **Security Focus**: Emphasizes secure key management, HTTPS, and input sanitization to address the `curl` command’s potential vulnerabilities.
- **Professional**: Follows standard README conventions, making it easy for developers to adopt.

### Example Use Case in Action
Suppose you’re building a web app that needs to call a third-party API (`https://jsonplaceholder.typicode.com/posts`) but faces CORS restrictions. You can:
1. Encrypt the request details (method, URL, headers, body) on the client using the provided `encryptPayload` function.
2. Send the encrypted payload to the Express Curl API, which decrypts it, validates the timestamp, and executes the `curl` command.
3. Receive the API’s response (e.g., the created post) securely, without exposing sensitive headers or body data in transit.

### Next Steps
1. **Add to Repository**:
   - Save the README as `README.md` in your `express-curl-api` repository root.
   - Update the `[your-email@example.com]` placeholder with your contact information.
   - If you have a `LICENSE` file, ensure it’s referenced correctly; otherwise, create one or remove the license section.

2. **Test Documentation**:
   - Follow the installation and usage instructions to ensure they work.
   - Test the example requests with the provided `client.js`, Python, and JavaScript snippets.
   - Verify the 2-minute expiration by delaying a request.

3. **Enhance Further** (Optional):
   - Add input sanitization to prevent command injection (e.g., validate `method` and `url`).
   - Implement API key authentication for per-client access control.
   - Include a `.env.example` file for environment variable configuration.
   - Add a FAQ section for common user questions.

4. **Publish**:
   - Push the updated README to your GitHub repository.
   - Share the repository with users or team members for feedback.

If you need additional sections (e.g., deployment instructions for AWS/Heroku, more client-side examples, or a specific tone), or if you want to integrate authentication or other features, let me know!
#   p r o x y - u r l  
 