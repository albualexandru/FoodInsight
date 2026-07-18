# FoodInsight

FoodInsight is a tiny, mobile-friendly webservice that estimates the calories
in your food. Take (or upload) a photo, and Google's **Gemini 3.5 Flash** model
analyzes it and returns an estimated calorie count. Your daily total is kept
in your browser's cookies, so every time you open the page you see how many
calories you've logged so far today.

## Features

- 📷 Take a photo (or upload one) directly from your phone
- 🤖 Calorie estimation powered by the Gemini 3.5 Flash vision model
- 🧮 Daily running total stored in your browser's cookies (no database, no accounts)
- 📱 Simple, single-page UI designed for quick use on a phone

## How it works

1. The browser sends the photo to the `/api/estimate-calories` endpoint.
2. The Node.js/Express server forwards the image to the Gemini API
   (`gemini-3.5-flash` model) with a prompt asking it to estimate calories.
3. The server parses Gemini's response and returns the food name, estimated
   calories, and a short note back to the browser.
4. The browser adds the entry to a cookie keyed by the current date
   (`foodinsight_YYYY-MM-DD`), so the daily total automatically resets each
   day and nothing is stored server-side.

## Project structure

```
server.js          Express server + Gemini integration (POST /api/estimate-calories)
public/             Static frontend (HTML/CSS/JS) served by Express
  index.html
  styles.css
  app.js
render.yaml         Render Blueprint for one-click deployment
.env.example         Example environment variables
```

## Running locally

### Prerequisites

- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
npm install
cp .env.example .env
# then edit .env and set GEMINI_API_KEY=your-actual-key
npm start
```

The server starts on `http://localhost:3000` by default (override with the
`PORT` environment variable).

## Environment variables

| Variable         | Required | Description                                                        |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `GEMINI_API_KEY`  | Yes      | API key for the Google Gemini API. Get one at https://aistudio.google.com/apikey |
| `PORT`            | No       | Port the server listens on. Defaults to `3000` (Render sets this automatically). |

## Deploying to Render

This repo includes a `render.yaml` Blueprint, so deployment only takes a
couple of steps:

1. Push this repository to GitHub (if you haven't already).
2. In the [Render Dashboard](https://dashboard.render.com/), click
   **New +** → **Blueprint**, and select this repository. Render will read
   `render.yaml` and configure the service automatically.
   - Alternatively, click **New +** → **Web Service**, select the repo, and
     use these settings manually:
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
3. When prompted for environment variables, set `GEMINI_API_KEY` to your
   Gemini API key (Render will prompt for this since it's marked as a secret
   in `render.yaml`). You can also add/edit it later under the service's
   **Environment** tab.
4. Click **Create Web Service** (or **Apply** for a Blueprint). Render will
   build and deploy the service. Once deployed, open the service URL on your
   phone, allow camera access when prompted, and start logging your meals!

Render automatically sets the `PORT` environment variable, and the server
already reads it, so no extra configuration is needed there.

## Notes

- No database or user accounts are used — your daily calorie log lives
  entirely in a browser cookie for the current date, so it's specific to the
  device/browser you use and automatically resets at midnight.
- Because everything is a single web service (Express serving both the API
  and the static frontend), it fits neatly into Render's free single-service
  tier.
