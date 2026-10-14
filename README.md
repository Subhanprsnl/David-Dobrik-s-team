# David's Halloween

The invite site for **David's Halloween** (Friday, October 30), built by Rumor Studio.

One screen, no scrolling. A spooky sunset pans down to the water, a ghost in sunglasses floats in on his pool float, and the flyer's title drips into place while bats cross the moon. Guests can tap the ghost (he raises a toast) or the water (it ripples) and RSVP in a pop-up that lists the house rules. The end screen shows the date, the RSVP button, Cazcanes (bottom-left) and **Powered by Rumor** (bottom-right).

The RSVP pop-up works in one of two modes:

- **Hand-off (default).** An **RSVP on Rumor** button opens the event at `https://therumor.com/p/926326` in the same tab. On a phone with the Rumor app installed, that universal link opens the app; otherwise the guest finishes on therumor.com.
- **Live.** Once Rumor's RSVP service is connected, the pop-up collects first name, last name, mobile number, email and Instagram, texts the guest a 4-digit code, confirms it, and then offers **Open in the Rumor app**. The code goes in one field marked `autocomplete="one-time-code"`, so the code iOS and Android read from Messages fills in all at once. It is sent automatically a moment after the last digit arrives, and Resend is locked for 30 seconds.

It's plain HTML, CSS and canvas JavaScript, with **no dependencies and no framework**. Old links to `/cinematic`, `/house` and `/flyer` redirect to the home page.

## Project layout

```
site/                    source that gets deployed
  index.html             the invite (canvas scene + RSVP pop-up)
  assets/img/            artwork cut from the flyer, icons, link-preview image
  assets/js/rsvp.js      talks to the RSVP API (send code, check code)
api/rsvp.js              Vercel function: validates each RSVP step and forwards it to Rumor
scripts/build.mjs        copies site/ to dist/, fills in the site URL, RSVP endpoint and Rumor event link, checks the build
vercel.json              build settings, clean URLs, redirects, caching and security headers
```

All of the page's code lives in `site/index.html`. Edit there, then rebuild.

## Run it locally

Requires Node 18.17 or newer.

```bash
npm run dev
```

Opens on http://localhost:3000. Without RSVP settings the pop-up runs in **hand-off** mode and links to the event on Rumor.

`npm run build` only builds. It **fails** if a page references a missing asset or contains the party's street address, which must never be published (guests get it by text after they RSVP).

## Put it on GitHub

```bash
git init
git add .
git commit -m "David's Halloween invite"
git branch -M main
git remote add origin https://github.com/<you>/davids-halloween.git
git push -u origin main
```

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repo.
2. Leave the framework preset as **Other**. Build command, output folder and clean URLs come from `vercel.json`.
3. Add environment variables (below) if RSVPs should be saved, then **Deploy**.

Link previews (iMessage, Slack, X) show the flyer. The build fills in the absolute URL automatically from Vercel's production domain. Set `SITE_URL` if you use a custom domain.

### Environment variables

| Variable | Needed for | Example |
|---|---|---|
| `RSVP_FORWARD_URL` | The live form. The API forwards both steps (send code, check code) here. Setting it switches the pop-up from hand-off to live. | `https://<rumor-endpoint>/rsvps` |
| `RSVP_FORWARD_TOKEN` | Optional. Sent as `Authorization: Bearer …` | |
| `RUMOR_EVENT_CODE` | Optional. Defaults to `926326`. | `926326` |
| `RUMOR_EVENT_URL` | Optional. Where **RSVP on Rumor** and **Open in the Rumor app** go. Defaults to `https://therumor.com/p/<RUMOR_EVENT_CODE>`. | |
| `SITE_URL` | Optional. Your custom domain, for link previews. | `https://davidshalloween.com` |
| `RSVP_ENDPOINT` | Optional override for where pages post. Defaults to `/api/rsvp` when `RSVP_FORWARD_URL` is set. | |

Redeploy after changing variables. Pages pick up the RSVP mode at build time.

### What the RSVP API sends

Two `POST`s to `RSVP_FORWARD_URL`, as JSON. The phone number is sent in E.164 format.

```json
{ "action": "start", "eventCode": "926326", "firstName": "Casper", "lastName": "Ghost",
  "email": "casper@ghost.com", "phone": "+13105550130", "instagram": "@casper",
  "smsConsent": true, "submittedAt": "2026-10-14T09:05:57.713Z" }
```

`start` should text the guest a 4-digit code. The second call is the same body with `"action": "verify"` and `"code": "1234"`. It should check the code and save the RSVP.

- Any 2xx counts as success.
- On `verify`, a 400, 401 or 422 response tells the guest the code didn't work and keeps them on the code screen.
- 429 asks them to wait.
- Anything else shows an error and keeps what they typed, so no RSVP is silently lost.

Bots that fill the hidden honeypot field are accepted and dropped.

## Before this goes to thousands of people

- **Connect RSVPs to Rumor.** Until `RSVP_FORWARD_URL` points at a Rumor endpoint that sends and checks codes for event 926326, guests RSVP on therumor.com or in the app through the hand-off link. That is the safe default. The SMS consent line in the form also needs Rumor's approved wording.
- **Studio pipeline.** If this page moves into the Studio codebase, it has to pass that pipeline's local checks and screenshot tests, then the full CI run. This standalone repo doesn't run those.
- **Test on real phones** (iPhone Safari and Android Chrome) for touch, tilt and frame rate.
- **Confirm the "presented by fomo" credit** with David's team.

## Notes

- Respects reduced motion (jumps straight to the end screen), safe areas on notched phones, and touch-friendly 44 px buttons.
