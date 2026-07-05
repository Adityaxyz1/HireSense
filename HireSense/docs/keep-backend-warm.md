# Keeping the backend warm (free tier)

The backend runs on Render's **free** tier, which spins the instance down after
~15 minutes of inactivity. The next request then pays a **30–60s cold start**,
during which Render's gateway returns errors with no CORS headers — the browser
reports this as a misleading "CORS policy / Failed to fetch" error.

The frontend already mitigates this (retry-with-backoff + a warm-up ping on app
load — see [`api.js`](../frontend/src/lib/api.js) and
[`AuthContext.jsx`](../frontend/src/contexts/AuthContext.jsx)). This doc is the
**durable** layer: an external uptime pinger hits `/health` on a schedule so the
dyno never goes to sleep in the first place.

## What to ping

| Field | Value |
|-------|-------|
| URL | `https://hiresense-backend-p09j.onrender.com/health` |
| Method | `GET` |
| Interval | every **10 minutes** (must be **< 15 min** to beat the idle timeout) |
| Healthy response | HTTP `200`, body `{"status":"healthy",...}` |
| Optional keyword check | `healthy` |

`/health` is unauthenticated and cheap (a single `profiles` row probe), so it's
safe to hit frequently.

## Option A — UptimeRobot (simplest, set-and-forget)

1. Create a free account at <https://uptimerobot.com>.
2. **+ Add New Monitor**.
3. Monitor Type: **HTTP(s)**.
4. Friendly Name: `HireSense backend`.
5. URL: `https://hiresense-backend-p09j.onrender.com/health`.
6. Monitoring Interval: **5 minutes** (the free-plan minimum — comfortably under
   the 15-min spin-down).
7. (Optional) Add your email under **Alert Contacts** to be notified on downtime.
8. Save.

That's it — UptimeRobot pings every 5 min and emails you if the backend ever
goes down.

## Option B — cron-job.org (flexible interval + time windows)

1. Create a free account at <https://cron-job.org>.
2. **Create cronjob**.
3. Title: `HireSense keep-warm`.
4. URL: `https://hiresense-backend-p09j.onrender.com/health`.
5. Schedule: **every 10 minutes**.
6. (Recommended — see caveat below) restrict to active hours, e.g. **08:00–23:00**,
   instead of 24/7.
7. Under request settings, leave method `GET`; optionally set expected status `200`.
8. Save / enable.

## ⚠️ Render free-tier caveat — instance hours

Render's free web services share a monthly **instance-hour** budget (~750
hrs/month). Pinging 24/7 keeps the service awake the whole month (~720 hrs),
which:

- uses **almost the entire free budget on this one service**, and
- can cause suspension at month-end if you run **other** free services that push
  the total over the limit.

**Recommendations:**

- If this is your **only** free Render service, 24/7 pinging is fine.
- If you run others, ping only during **active hours** (Option B step 6) so the
  service still sleeps overnight and conserves hours.
- For a true no-spin-down guarantee, upgrade the Render service off the free
  tier (~$7/mo). The frontend retry/warm-up code then becomes belt-and-suspenders.

## Verifying it works

After the pinger has run for a few minutes, the backend should respond instantly
(no cold-start delay). You can confirm a single ping from your machine:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" \
  https://hiresense-backend-p09j.onrender.com/health
```

A warm instance returns `HTTP 200` in well under a second; a cold one takes
30–60s on the first hit.
