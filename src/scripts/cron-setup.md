# Cron Job Setup for SpotMatch AI Agents

## Pilot offer expiry and retention

The protected endpoint below must be called every minute by an external HTTP scheduler (for example cron-job.org or Vercel Cron where available):

- URL: `https://your-domain.example/api/cron/expire-offers`
- Method: `POST`
- Headers: `Authorization: Bearer <CRON_SECRET>` and `x-cron-secret: <CRON_SECRET>`
- Schedule: Every minute

It expires offers, reassigns the next eligible network member, never uses public fallback for B2B spots, and invokes the retention RPC. Supabase `pg_cron` separately schedules `cleanup_pilot_data()` every five minutes when the extension is available; that SQL job cleans stale spots, completed handoffs, precise locations, and ephemeral chats.

Apply migrations `00042` through `00047` before enabling pilot traffic. Keep `CRON_SECRET` server-side and do not use the Supabase service-role key as the scheduler secret.

Since Vercel's free plan doesn't include cron jobs, use **cron-job.org** (free) to hit these endpoints:

## 1. Congestion Alert Agent (every 5 minutes)
- URL: `https://parkingapp-pi.vercel.app/api/agents/congestion`
- Method: POST
- Schedule: Every 5 minutes

## 2. Spot Prediction Agent (every 30 minutes)
- URL: `https://parkingapp-pi.vercel.app/api/agents/predict-spots`
- Method: POST
- Schedule: Every 30 minutes

## 3. Ad Insights Agent (weekly)
- URL: `https://parkingapp-pi.vercel.app/api/agents/ad-insights`
- Method: POST
- Schedule: Every Monday at 9:00 AM

## How to set up at cron-job.org:
1. Go to https://cron-job.org and sign up (free)
2. Click "Create Cronjob"
3. Enter the URL, method (POST), and schedule
4. Save — it will start hitting your endpoint on schedule

## Demand-Match Agent (real-time, no cron needed)
The demand-match agent runs in real-time via Supabase Realtime subscription.
When a new spot is posted, the app automatically calls:
`POST /api/agents/demand-match` with `{ "spot_id": "..." }`

## User Growth Agent (triggered on spot post)
Similarly triggered by the real-time subscription:
`POST /api/agents/grow-users` with `{ "spot_id": "..." }`

## Optional: Ollama Setup
To enable AI-generated messages, set:
- `OLLAMA_BASE_URL` env var in Vercel to your Ollama server URL
- Model defaults to `llama3`, override with `OLLAMA_MODEL`

Without Ollama, agents fall back to template messages.
