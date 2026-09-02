# Realm Verify — Cloud Deployment Guide

This guide provides step-by-step instructions for deploying **Realm Verify** to production with:
- **Backend API:** [Render](https://render.com) (FastAPI + Python 3.11)
- **Frontend App:** [Netlify](https://netlify.com) (Next.js 14 App Router)

---

## 🏗️ Architecture Overview

`
┌─────────────────────────┐               ┌──────────────────────────────┐
│     Netlify Frontend    │  REST (HTTPS) │        Render Backend        │
│   (Next.js 14 React UI) │ ────────────► │     (FastAPI + Python 3.11)  │
│   https://app.netlify.app│               │  https://*.onrender.com/api  │
└─────────────────────────┘               └──────────────┬───────────────┘
                                                         │
                                          ┌──────────────┴───────────────┐
                                          │   MongoDB Atlas Cloud Store  │
                                          │   (Runs, Audit, Chat, RL)    │
                                          └──────────────────────────────┘
`

---

## 🚀 Part 1: Deploy Backend on Render

### Method A: Using Render Blueprints (ender.yaml) — Recommended

1. Push your repository to **GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your **Realm-verify** repository.
5. Render will automatically detect ender.yaml and configure the service:
   - **Service Name:** ealm-verify-api
   - **Runtime:** Python 3
   - **Build Command:** pip install -r requirements.txt
   - **Start Command:** uvicorn src.api:app --host 0.0.0.0 --port 
6. Click **Apply**.
7. In the service's **Environment** tab, set your secrets (e.g. LLM_API_KEY for Groq).

---

### Method B: Manual Web Service Setup on Render

1. Go to [Render Dashboard](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Connect your **Realm-verify** repository.
3. Configure the following settings:
   | Setting | Value |
   | :--- | :--- |
   | **Name** | ealm-verify-api (or your preferred name) |
   | **Region** | Oregon (US West) or Singapore / Frankfurt |
   | **Branch** | main |
   | **Root Directory** | *(Leave blank)* |
   | **Runtime** | Python 3 |
   | **Build Command** | pip install -r requirements.txt |
   | **Start Command** | uvicorn src.api:app --host 0.0.0.0 --port  |
   | **Instance Type** | Free (or Starter) |

4. Scroll down to **Environment Variables** and add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | PYTHON_VERSION | 3.11.9 | Ensures Python 3.11 compatibility |
   | LLM_API_KEY | gsk_... | Groq API key for Explainable AI (Optional) |
   | LLM_BASE_URL | https://api.groq.com/openai/v1 | Groq endpoint |
   | LLM_MODEL | llama-3.3-70b-versatile | High-speed LLM model |
   | MONGO_USERNAME | mkbm1307_db_user | (Optional: pre-configured) |
   | MONGO_PASSWORD | dYkrbBvA1uOEqhR | (Optional: pre-configured) |
   | MONGO_CLUSTER | ealm1.litipri.mongodb.net | (Optional: pre-configured) |

5. Click **Create Web Service**.
6. Wait 2–3 minutes for the build to complete. Once deployed, Render will provide your backend URL:
   https://<your-render-service-name>.onrender.com

7. **Verify Backend Deployment:**
   - Visit https://<your-render-service-name>.onrender.com/ in your browser.
   - You should see:
     `json
     {
       "service": "Realm Verify API",
       "status": "ONLINE",
       "version": "1.0.0",
       "docs": "/docs",
       "health": "/api/health"
     }
     `
   - Swagger interactive documentation is accessible at https://<your-render-service-name>.onrender.com/docs.

---

## 🌐 Part 2: Deploy Frontend on Netlify

### Step-by-Step Instructions:

1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize access to your repository (Realm-verify).
4. Netlify will automatically read 
etlify.toml. Verify the build configuration:
   - **Base directory:** *(Leave blank)*
   - **Build command:** 
pm run build
   - **Publish directory:** .next
5. Click **Environment Variables** (or configure under *Site settings* → *Environment variables*):
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | NEXT_PUBLIC_API_URL | https://<your-render-service-name>.onrender.com/api | Your live Render backend API URL |
   | NODE_VERSION | 20 | Node.js 20 LTS |

   > **Note:** The API client automatically normalizes the URL, so whether you provide https://<app>.onrender.com or https://<app>.onrender.com/api, it resolves correctly.

6. Click **Deploy Site**.
7. Netlify will build the Next.js application using @netlify/plugin-nextjs.
8. Once complete, your frontend is live at https://<site-name>.netlify.app!

---

## ⚙️ Configuration Files Added to the Repository

| File | Purpose |
| :--- | :--- |
| ender.yaml | Render Blueprint infrastructure-as-code configuration for 1-click backend deployment. |
| 
etlify.toml | Netlify build configuration with @netlify/plugin-nextjs and security headers. |
| Procfile | Web process definition for Python ASGI servers. |
| untime.txt | Python runtime version pin (python-3.11.9). |
| equirements.txt | Updated with pymongo[srv], certifi, dnspython, and python-multipart. |
| lib/api.ts | URL normalization ensuring robust API connectivity across cloud domains. |
| src/api.py | Added root / discovery endpoint, /health alias, and automated directory initialization. |

---

## 💡 Pro-Tips for Production

1. **Render Free Tier Cold Starts:**
   Render free instances spin down after 15 minutes of inactivity. When a request comes in, it takes ~30 seconds to wake up. For zero downtime, consider upgrading to the Starter plan (/mo) or setting up a free uptime monitor (e.g., UptimeRobot) pinging https://<your-render-service-name>.onrender.com/health every 10 minutes.

2. **CORS:**
   FastAPI in src/api.py is pre-configured with full CORS support (llow_origins=["*"]), allowing your Netlify domain, custom domain, and local preview environments to make API requests without CORS issues.
