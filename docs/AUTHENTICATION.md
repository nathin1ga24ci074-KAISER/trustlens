# TrustLens Authentication Architecture

## Overview

TrustLens uses an email/password authentication model paired with JSON Web Tokens (JWT) and HTTP-only cookie transport.

---

## Security Guarantees

1. **Password Hashing**: Passwords are never stored in plaintext. They are salted and hashed using `bcrypt` with 12 calculation rounds.
2. **Account Enumeration Protection**: Login authentication failures return identical responses (`Invalid email or password`) regardless of whether the email exists.
3. **Password Hash Privacy**: Internal database queries and API responses explicitly sanitize the `passwordHash` field before passing data to controllers or the client.
4. **Token Storage**:
   - The primary session token is transmitted via an `httpOnly`, `SameSite=Lax` (or `Strict` in production), and `Secure` cookie to mitigate Cross-Site Scripting (XSS) token exfiltration.
   - For headless or non-browser API consumers, tokens can also be passed via the `Authorization: Bearer <token>` header.
5. **Input Validation**: Handled declaratively with Zod schemas:
   - Email: Lowercased, whitespace-trimmed, and format validated.
   - Password: Minimum 8 characters, maximum 128 characters, requires at least 1 letter and 1 number.
   - Name: Minimum 2 characters, maximum 100 characters.

---

## API Endpoints

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Registers a new user account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and issues session token |
| `POST` | `/api/auth/logout` | Public | Clears authentication session cookie |
| `GET` | `/api/auth/me` | Protected | Returns the authenticated user profile |
