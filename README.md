# Haq Scholar

**Find the scholarships you are likely eligible for, in plain language.**

Many students from low-income families in Telangana never claim the government scholarships they qualify for. Information is spread across portals, eligibility rules are hard to read, and students often pay agents for help that should be free.

Haq Scholar lets a student describe their situation in a few words and shows:
- which scholarships they are **likely** eligible for, and the rule behind each result
- which documents they need
- how to apply, step by step, with official links
- their applications and upcoming deadlines

Built for the **ACE Builders Hackathon 2026** (Problem Statement 5: "Claim What's Yours") using the **Codebenders IDE** and **Nexen AI**.

> Status: in development (21–22 November 2026)

---

## Principles

- **Never "guaranteed".** Results say *Likely eligible*, *Check one thing* or *Not eligible*.
- **Privacy first.** No Aadhaar, bank, phone or certificate numbers are collected, stored or logged. Raw student descriptions are never persisted, and unsanitised input is never sent to external AI services.
- **Rules decide, not AI.** AI or a parser only reads the student's description. A deterministic rules engine decides eligibility.
- **Honest about uncertainty.** Conflicting or unverified rules are evaluated as UNKNOWN. Missing profile information also produces UNKNOWN, never FAIL. Rules that do not apply are reported separately as NOT APPLICABLE.
- **Rules are data.** Scheme rules can be edited without changing code, and each scheme links to its official source with a last-verified date.

---

## How it works

1. The student types their situation, for example *"BC-B, first-year BSc, village in Nalgonda, family income about 1.2 lakh"*.
2. The app pulls out profile details (category, income, rural/urban, course, year, age) and shows them as editable chips.
3. The rules engine checks every scheme rule: **PASS**, **FAIL**, **UNKNOWN** or **NOT APPLICABLE**.
4. Results are grouped as **Likely eligible**, **Check one thing** or **Not eligible**, each with its reasons.
5. The student opens a scheme to see the document checklist and the application steps, and can track their application.

---

## Repository structure

```
client/                 React + Vite frontend (mobile-first web app)
  src/
    home/               Input box and profile review            (Member A)
    results/            Results screen                          (Member B)
    scheme/             Scheme detail and application guide     (Member B)
    tracker/            Application tracking and reminders      (Member B)
    admin/              Admin rules editor UI                   (Member B)
    theme/              Design tokens                           (Member A)
    locales/            English, Telugu, Hindi                  (Member A)

server/                 Node.js + Express backend               (Member A)
  src/
    engine/             Eligibility rules engine (pure, tested)
    api/                API endpoints
    ai/                 Input sanitising and profile extraction
    db/                 Scheme data
  test/                 Server tests

shared/                 Shared by client and server             (Member A)
  types.ts              Data types
  contracts.ts          API request/response shapes
  fixtures/             Mock data and fictional test profiles

docs/
  BRIEF.md              Main project brief (start here)
  decisions/            Short records of key decisions
  slice0-brief.md       Original requirements
  s0-approval.md        Architecture approval
```

**Ownership rule:** only edit folders you own. Changes to `shared/` go through Member A.

---

## Running locally

Server (tests and type-check):
```bash
cd server
npm install
npm test
npm run build
```

Client:
```bash
cd client
npm install
npm run dev
```

---

## Progress

Completed milestones:
- [x] **S0 – Foundation:** project structure, shared types and API contracts, mock fixtures, theme and locale skeleton
- [x] **S2 – Eligibility engine:** deterministic rules engine; 26/26 tests passing (verified 22 Nov, 00:24 IST)

Still to do:
- [ ] API endpoints and scheme seed data
- [ ] Input box and profile extraction
- [ ] Results and scheme detail screens
- [ ] Application tracker and deadline reminders
- [ ] Admin rules editor
- [ ] Deployment

This list is updated at each milestone.

---

## Data sources

Public scheme information only:
- [Telangana ePASS](https://telanganaepass.cgg.gov.in/)
- [National Scholarship Portal](https://scholarships.gov.in/)

All profiles used in testing and demos are fictional.

---

## Team

- **Member A:** backend, eligibility engine, extraction, Home/Profile UI, shared contracts, admin backend, integration and deployment
- **Member B:** Results and scheme UI, tracker, admin UI, responsive frontend and scheme source research