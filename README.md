# David's Halloween

Two one-screen invite concepts for **David's Halloween** (Friday, October 30), built by Rumor Studio, plus a page that links them.

| Route | What it is |
|---|---|
| `/` | Concepts hub: phone previews, a comparison, launch notes |
| `/cinematic` | **Cinematic**: sunset pans down to the water, the ghost floats in; tap the ghost or the water |
| `/house` | **The House**: a drone glide down the pool at David's house that settles into a living poster; tap the ghost, pool, fire pit, pumpkins or house |

Each concept is a single screen with no scrolling. Each has an RSVP pop-up (name, phone, Instagram, email), a **‹ Concepts** button back to the hub, and the exact flyer lettering. Both also have a **Flyer** button that opens the flyer with Share.

It's plain HTML, CSS and canvas JavaScript, with **no dependencies and no framework**.

## Project layout

```
site/                    source that gets deployed
  index.html             hub
  cinematic/index.html   Cinematic (canvas + RSVP + flyer sheet)
  house/index.html       The House (2.5D canvas scene + RSVP + flyer sheet)
  assets/img/            artwork cut from the flyer, previews, icons, link-preview image
  assets/js/rsvp.js      sends the RSVP to the API (shared by both pages)
api/rsvp.js              Vercel function: validates an RSVP and forwards it to Rumor
scripts/build.mjs        copies site/ to dist/, fills in the site URL and RSVP endpoint, checks the build
vercel.json              build settings, clean URLs, caching and security headers
```

Each page's code lives in its own `index.html`. Edit there, then rebuild.

## Run it locally

Requires Node 18.17 or newer.

```bash
npm run dev
```

Opens on http://localhost:3000. Without RSVP settings the form runs in **demo mode**: it validates and confirms but sends nothing.

`npm run build` only builds. It **fails** if a page references a missing asset or contains the party's street address, which must never be published (guests get it by text after they RSVP).

## Put it on GitHub

```bash
git init
git add .
git commit -m "David's Halloween concepts"
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
| `RSVP_FORWARD_URL` | Saving RSVPs. The API forwards each RSVP here. Setting it also switches the pages from demo mode to live. | `https://<rumor-endpoint>/rsvps` |
| `RSVP_FORWARD_TOKEN` | Optional. Sent as `Authorization: Bearer …` | |
| `RUMOR_EVENT_CODE` | Optional. Defaults to `926326`. | `926326` |
| `SITE_URL` | Optional. Your custom domain, for link previews. | `https://davidshalloween.com` |
| `RSVP_ENDPOINT` | Optional override for where pages post. Defaults to `/api/rsvp` when `RSVP_FORWARD_URL` is set. | |

Redeploy after changing variables. Pages pick up the RSVP mode at build time.

### What the RSVP API sends

`POST RSVP_FORWARD_URL` with JSON:

```json
{
  "eventCode": "926326",
  "name": "Casper Ghost",
  "email": "casper@ghost.com",
  "phone": "3105550130",
  "instagram": "@casper",
  "concept": "house",
  "submittedAt": "2026-10-12T09:05:57.713Z"
}
```

Any 2xx response counts as saved. Anything else shows the guest "We couldn't save your RSVP. Please try again." and keeps their form, so no RSVP is silently lost. Bots that fill the hidden honeypot field are accepted and dropped.

## Before this goes to thousands of people

- **Connect RSVPs to Rumor.** The brief says RSVPs must go through the Studio process like a normal sign-up. This repo forwards to whatever `RSVP_FORWARD_URL` you give it. The Rumor endpoint for event 926326 (or a Studio rebuild of the chosen concept, which is how Hochstein was done) still needs to be set up and tested.
- **Studio pipeline.** If the chosen concept moves into the Studio codebase, it has to pass that pipeline's local checks and screenshot tests, then the full CI run. This standalone repo doesn't run those.
- **Test on real phones** (iPhone Safari and Android Chrome) for touch, tilt and frame rate.
- **Confirm the "presented by fomo" credit** with David's team.

## Notes

- The listing photos used as reference for The House are **not** included. They're MLS-watermarked and not needed at runtime; the house is drawn in code.
- Respects reduced motion (jumps straight to the end screen), safe areas on notched phones, and touch-friendly 44 px buttons.
