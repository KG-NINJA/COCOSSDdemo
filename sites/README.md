# ChatGPT Sites migration

This directory is the first migration stage for COCOSSDdemo.

## Phase 1: preserve the existing browser vision pipeline

The Site UI remains static HTML/CSS/JavaScript. Camera capture, COCO-SSD inference,
environment metrics, speech synthesis, and heart-rate estimation stay in the visitor's
browser. To keep the first ChatGPT Sites build small, TensorFlow.js, the COCO-SSD
wrapper, and the approximately 18 MB model weights continue to load from the existing
GitHub Pages deployment.

Source asset host:
- https://kg-ninja.github.io/COCOSSDdemo/

This keeps the migration reversible: the original GitHub Pages site remains unchanged.

## Phase 2: Sign in with ChatGPT

ChatGPT Sites supports Sites that intentionally add Sign in with ChatGPT. Identity
sign-in and the Site audience setting are separate controls. Add identity only after the
camera-only build works in Sites.

Do not put OAuth access tokens or refresh tokens in browser storage, source code,
URLs, logs, or analytics.

## Phase 3: ChatGPT-powered analysis

Treat ChatGPT plan usage as a separate capability from identity sign-in. Current
OpenAI documentation says the open-source ChatGPT-plan flow is documented for
open-source/local/self-hosted clients, while paid or remotely hosted apps may require
separate participation/approval. Therefore the migration must not claim that a public
ChatGPT Site can consume every visitor's Plus/Pro plan until that path is confirmed for
this Site.

The intended AI input is structured local state, not continuous video. Example payload:

```json
{
  "detections": [{"class":"dog","score":0.91}],
  "ambient_percent": 31.2,
  "motion_score": 4.8,
  "color_bias": "N",
  "phase": "LIVE"
}
```

Only send a frame/image when a future AI feature explicitly needs vision reasoning and
the visitor has consented.

## Suggested @Sites build instruction

Build a ChatGPT Site from the files in the `sites/` directory of
https://github.com/KG-NINJA/COCOSSDdemo/tree/chatgpt-sites-migration/sites

Requirements:
1. Preserve the current visual layout and Japanese UI.
2. Preserve browser-local camera access and COCO-SSD detection.
3. Keep TensorFlow.js, COCO-SSD JS and model files on the existing GitHub Pages host
   for this first migration.
4. Do not add API keys or secrets to client code.
5. Do not add AI inference yet; first verify camera permission, model loading,
   detection, metrics, and speech in the Sites runtime.
6. After the local vision pipeline works, add a separate ChatGPT AI panel and
   Sign in with ChatGPT as a second stage.
