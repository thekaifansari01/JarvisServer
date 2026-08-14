# JARVIS OAuth Server & Documentation Site

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Redis](https://img.shields.io/badge/Upstash%20Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](LICENSE)
[![Maintainer](https://img.shields.io/badge/Maintainer-Kaif%20Ansari-6f42c1?style=for-the-badge)](https://github.com/thekaifansari01)

> **Secure OAuth 2.0 server for Gmail and Google Calendar integration, paired with a sleek documentation site for JARVIS – the autonomous AI agent.**  
> Built by **Kaif Ansari** – 18‑year‑old self‑taught AI developer.

**Live Site:** [jarvis-agent.vercel.app](https://jarvis-agent.vercel.app)  
**GitHub:** [thekaifansari01/Jarvis-OS-Agent](https://github.com/thekaifansari01/Jarvis-OS-Agent)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [OAuth Flow (Gmail & Calendar)](#oauth-flow-gmail--calendar)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Deployment on Vercel](#deployment-on-vercel)
- [Local Development](#local-development)
- [Static Pages](#static-pages)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Maintainer – Kaif Ansari](#maintainer--kaif-ansari)

---

## Overview

This repository contains two main components:

1. **OAuth 2.0 Server** – handles Google OAuth flows for Gmail and Calendar, storing tokens temporarily in Upstash Redis. It is designed to work seamlessly with the JARVIS desktop agent.
2. **Marketing & Documentation Website** – a sleek, dark‑themed landing page with documentation, FAQ, about page, and privacy policy for the JARVIS project.

The entire stack is deployed on **Vercel** as serverless functions and static pages, making it fast, scalable, and maintenance‑free.

---

## Features

- 🔐 **Secure OAuth 2.0** – supports Gmail (`mail`) and Google Calendar (`calendar`) scopes.
- 🗄️ **Upstash Redis** – temporary storage for OAuth state and session tokens (auto‑expires in 5 minutes).
- 📄 **Static Pages** – fully responsive, dark‑themed marketing site built with Tailwind CSS.
- ⚡ **Serverless** – Python functions on Vercel handle start, callback, and token exchange.
- 🧩 **Easy Integration** – JARVIS desktop agent retrieves tokens via a simple `session_id` exchange.
- 🔒 **Privacy‑Focused** – no telemetry, no tracking, and tokens are never logged.

---

## OAuth Flow (Gmail & Calendar)

The OAuth flow is designed to be secure and user‑friendly for the JARVIS desktop agent:

1. **User triggers login** from JARVIS CLI (`jarvis login --mail` or `--calendar`).
2. **JARVIS opens** the browser to `/api/oauth/start?service=mail` (or `calendar`).
3. **Start endpoint** generates a random `state`, stores it in Redis (5‑minute TTL), and redirects to Google's consent screen.
4. **Google redirects** back to `/api/oauth/callback` with an authorization `code` and the same `state`.
5. **Callback endpoint** verifies the `state`, exchanges the `code` for access/refresh tokens, stores them in Redis with a `session_id`, and redirects to a success page.
6. **Success page** shows a `jarvis://callback?session_id=...` deep link – JARVIS intercepts this and calls `/api/oauth/exchange` to retrieve the tokens.
7. **Exchange endpoint** returns the tokens as JSON and deletes them from Redis (one‑time use).

> **Note:** Tokens are **never exposed** to the browser; they are transmitted directly from Redis to the JARVIS desktop client via the secure serverless function.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend (Static)** | HTML5, Tailwind CSS, Font Awesome, Google Fonts |
| **Backend (Serverless)** | Python 3.9+ (Vercel serverless functions) |
| **Database (Cache)** | Upstash Redis (temporary state & session storage) |
| **OAuth Provider** | Google OAuth 2.0 (Gmail API, Calendar API) |
| **Hosting** | Vercel (Edge Network) |

---

## Project Structure

```
Jarvis-OS-Agent/
├── public/                      # Static pages (served by Vercel)
│   ├── index.html               # Landing page
│   ├── documentation.html       # Full documentation
│   ├── faq.html                 # Frequently Asked Questions
│   ├── about.html               # About the builder (Kaif Ansari)
│   └── privacy.html             # Privacy policy
├── api/                         # Serverless functions
│   └── oauth/
│       ├── start.py             # /api/oauth/start – initiates OAuth
│       ├── callback.py          # /api/oauth/callback – handles Google redirect
│       └── exchange.py          # /api/oauth/exchange – retrieves tokens
├── vercel.json                  # Vercel deployment configuration
├── requirements.txt             # Python dependencies
├── robots.txt                   # Crawler directives
├── sitemap.xml                  # XML sitemap for SEO
└── README.md                    # This file
```

---

## Environment Variables

Create a `.env` file (or set them in Vercel dashboard) with:

```env
# Google OAuth Credentials (obtain from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=https://your-domain.vercel.app/api/oauth/callback

# Upstash Redis (for temporary session storage)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

> **Important:** `REDIRECT_URI` must exactly match the one registered in Google Cloud Console. For local testing, use `http://localhost:3000/api/oauth/callback`.

---

## Deployment on Vercel

1. **Install Vercel CLI** (optional but recommended):
   ```bash
   npm i -g vercel
   ```

2. **Login** to Vercel:
   ```bash
   vercel login
   ```

3. **Link** the project:
   ```bash
   vercel link
   ```

4. **Set environment variables** in Vercel dashboard (or via `vercel env add`).

5. **Deploy**:
   ```bash
   vercel --prod
   ```

6. **Verify** that:
   - Static pages load at `https://your-domain.vercel.app/`
   - OAuth endpoints respond at `/api/oauth/start`, `/api/oauth/callback`, `/api/oauth/exchange`

---

## Local Development

For local testing, you can run the serverless functions using **Vercel Dev**:

```bash
# Install dependencies
pip install -r requirements.txt

# Install Vercel CLI (if not already)
npm i -g vercel

# Start dev server
vercel dev
```

The site will be available at `http://localhost:3000`. OAuth redirects will work if you set `REDIRECT_URI` to `http://localhost:3000/api/oauth/callback` (and register this URI in Google Cloud Console).

---

## Static Pages

| Page | URL | Description |
|:---|:---|:---|
| **Landing** | `/` | Product overview, features, download CTA. |
| **Documentation** | `/documentation` | Detailed technical documentation for JARVIS. |
| **FAQ** | `/faq` | Frequently asked questions. |
| **About** | `/about` | About the builder – Kaif Ansari. |
| **Privacy** | `/privacy` | Privacy policy (GDPR compliant). |

All pages are fully responsive, dark‑themed, and optimised for fast load times.

---

## API Endpoints

### `GET /api/oauth/start?service={mail|calendar}`

Initiates the OAuth flow. Redirects to Google consent screen.

**Query Parameters:**
- `service` – `mail` (Gmail) or `calendar` (Google Calendar).

**Response:** 302 Redirect to Google.

---

### `GET /api/oauth/callback`

Handles the Google redirect. Exchanges `code` for tokens and stores them in Redis.

**Query Parameters (from Google):**
- `code` – authorization code.
- `state` – state parameter (validated against Redis).

**Response:** HTML success page with a `jarvis://` deep link.

---

### `POST /api/oauth/exchange`

Retrieves tokens for a given session and deletes them from Redis.

**Request Body:**
```json
{
  "session_id": "uuid-from-success-page"
}
```

**Response (Success):**
```json
{
  "token": "access_token",
  "refresh_token": "refresh_token",
  "expiry": "2026-08-14T12:34:56Z",
  "token_uri": "https://oauth2.googleapis.com/token",
  "client_id": "...",
  "client_secret": "..."
}
```

**Response (Error):**
```json
{
  "error": "Session expired or already used"
}
```

---

## Security

- **State Parameter** – prevents CSRF attacks; stored in Redis with a 5‑minute TTL.
- **One‑Time Tokens** – session tokens are deleted after retrieval.
- **No Logging** – tokens and codes are never written to logs.
- **CORS** – all API endpoints set appropriate CORS headers (if needed).
- **Secure Cookies** – not used in this serverless setup, but all traffic is over HTTPS.

---

## Contributing

We welcome contributions to improve the OAuth server, documentation, or static pages.

1. **Fork** the repository.
2. **Create** a feature branch: `git checkout -b feature/your-feature`.
3. **Commit** your changes.
4. **Push** to the branch.
5. **Open** a Pull Request against `main`.

> By contributing, you agree to the [Contributor License Agreement (CLA)](CONTRIBUTING.md) – ensuring the project can remain open‑source while offering commercial licensing options.

---

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

---

## Maintainer – Kaif Ansari

**Kaif Ansari** is an 18‑year‑old self‑taught AI developer and BCA student from Muzaffarnagar, India. He built JARVIS and this OAuth server entirely solo – no team, no funding – driven by a passion for building autonomous AI agents that actually work.

- 🐙 **GitHub**: [thekaifansari01](https://github.com/thekaifansari01)
- 🔗 **LinkedIn**: [thekaifansari01](https://linkedin.com/in/thekaifansari01)
- 🐦 **X (Twitter)**: [thekaifansari01](https://x.com/thekaifansari01)
- 📧 **Email**: [kaif.ansari.global@gmail.com](mailto:kaif.ansari.global@gmail.com)
- 🌐 **Portfolio**: [buildwithkaif.vercel.app](https://buildwithkaif.vercel.app)

---

## ⭐ Support the Project

If you find this OAuth server or the JARVIS project useful, please give it a **star** on [GitHub](https://github.com/thekaifansari01/Jarvis-OS-Agent) – it helps other developers discover it and motivates us to keep improving.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/thekaifansari01">Kaif Ansari</a> & the open‑source community.
</p>