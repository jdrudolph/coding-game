# Code Blue: The Ward Round

A pixel-art time-management game about hospital case coding. You are the coding specialist on a busy ward: patients arrive, clues trickle in (admission notes, labs, X-rays, OR reports, nursing notes), and you have to code every case before the patient goes home. Then the MD auditor shows up.

**Play:** open `index.html` in any modern browser. It is a single self-contained file (fonts load from Google Fonts, everything else is inline), so you can send it to friends, drop it on GitHub Pages, or host it anywhere.

## What's in it

- **Shifts** of ~5 minutes (1 game day = 30 s). Drag ICD-10-GM diagnosis and OPS procedure cards onto the chart; a live grouper shows the resulting DRG, PCCL and euro value as you go.
- **Code early or wait?** Later documents can change everything: troponin turns chest pain into an NSTEMI, pathology turns gallstones into acute cholecystitis, a suspected embolism gets ruled out.
- **Energy actions:** *Ask the doctor* (5 doctors with different personalities) reveals what never made it into the chart; *Chase documentation* turns vague notes into codable diagnoses; *Coffee* refills energy while the ward keeps running.
- **Scoring:** billed value, clean-case bonus, "sharp eye" bonus for DRG-relevant secondary diagnoses, combo streaks. Upcoding pays now…
- **MD audit boss fight** at the end of each week: defend every challenged code by presenting the document that proves it. Unsupported codes are clawed back with a surcharge, and a bad record raises next week's audit quota.
- **Career:** 5 wards unlock week by week (Internal Medicine, Surgery, Cardiology, Geriatrics, ICU, then the whole hospital), with a perk after each audit (Speed Reader, Doctor Whisperer, Double Espresso, …).
- **Daily challenge:** the same seeded shift for everyone each day. Share your result as text; friends paste each other's results into the leaderboard (no server needed, the result code is checksummed).
- Tutorial tips, codebook, DRG catalogue, keyboard controls, chiptune sound effects and optional music. Progress is saved in the browser.

The coding logic follows the real German G-DRG approach (principal diagnosis → base DRG, OR procedures → surgical DRGs, CCL → PCCL → severity split, documentation requirements, MD audits), but DRG names, splits and relative weights are simplified for play. It is not a coding reference.

## Development

Source lives in `src/` (data, engine/grouper, pixel renderer, audio, game, screens). Rebuild the bundled file with:

```
python3 build.py
```

This writes `index.html` (standalone) and `dist/artifact.html` (body-only variant for hosting as a claude.ai artifact).
