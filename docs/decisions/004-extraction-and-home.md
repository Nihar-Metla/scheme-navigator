# 004 — S4: Input sanitising, keyword extraction and Home screen (22 Nov 2026)

## Goal
A student types their situation in plain English, sees the extracted details as editable chips, answers at most 3 follow-up questions, and gets results from `/api/evaluate`.

## Ground rules
- Shared files win. If `shared/contracts.ts` already defines an extraction endpoint or types, use them and report any mismatch. Do not modify `shared/` without approval.
- Use attribute names and value spellings exactly as in `shared/types.ts` and `shared/fixtures/profiles.ts`.
- The extractor never decides eligibility. It only produces profile attributes.
- No new runtime dependencies unless unavoidable.

---

## S4a — Server: sanitiser, extractor, endpoint

### Files
| File | Purpose |
|---|---|
| `server/src/ai/extract.ts` | Keep the existing `sanitise`; extend it per the rules below. Keep the provider-independent `ProfileExtractor` interface. |
| `server/src/ai/keywordExtractor.ts` | Deterministic English keyword extractor implementing `ProfileExtractor` |
| `server/src/api/routes/extract.ts` | `POST /api/extract` |
| `server/src/api/app.ts` | Register the extract route only |
| `server/package.json` | Add `"dev": "tsx watch src/index.ts"` and `"start": "tsx src/index.ts"` |
| `server/test/extract.test.ts` | Tests below |

### Sanitiser (runs before any extractor)
- Replace any run of 9 or more digits, including runs split by spaces or hyphens (e.g. `1234 5678 9012`, `98765-43210`), with `[removed]`. This covers Aadhaar, phone and bank account numbers.
- Keep shorter numbers, so income (`120000`, `1,20,000`) and age still parse.
- Match each candidate digit sequence (digits optionally separated by single spaces or hyphens) and remove the entire matched sequence, so no partial number is left behind. Commas are not separators, so formatted income like `₹1,20,000` is never treated as one long number. Do not use a plain `\d{9,}` replacement.
- Remove every sensitive sequence when several appear in one input.
- Trim and cap input at 1,000 characters.

### Keyword extractor (English only)
Returns only the attributes it is confident about. Never guesses.
- **category:** SC, ST, BC-A to BC-E (accept `BC-B`, `BC B`, `BCB`), EBC, OC, Minority. Map to the enum values in `shared/types.ts`.
- **annual_income:** `1.2 lakh`, `1.2 lakhs`, `1.2 lac`, `1.2L` → 120000; `₹1,20,000`, `Rs 120000`, `120000`. Only when near words like income, earn, salary, family or lakh, or written with ₹/Rs.
- **area:** village, rural, mandal → rural; city, town, urban → urban. Otherwise leave unset (do not infer from district names).
- **course_level:** class 9 / 9th → `CLASS_9`; class 10 → `CLASS_10`; intermediate, inter, 11th, 12th → the fixture value for intermediate; BSc, BCom, BA, B.Tech, BE, degree, graduation, UG → the UG value; MSc, MA, MCom, MBA, M.Tech, PG, masters → the PG value. Use the spellings from the fixtures.
- **year_of_study:** first/1st → 1, second/2nd → 2, third/3rd → 3, fourth/4th → 4.
- **age:** `I'm 19`, `19 years`, `age 19`, `aged 19` (10–60 only).

### `POST /api/extract`
Request: `{ "text": "..." }`. `text` must be a non-empty string, otherwise `400`.
Response `200`: `{ "attributes": { ...only fields found } }` (or the contract's shape if one exists).
- The response never contains the input text.
- The text is never logged, stored or included in errors.

### Additional correctness requirements
- Income extraction uses contextual boundaries and never confuses age, year of study or other numbers with income (the `19` in `age 19` is never income; `120000` is never age).
- Never infer a missing attribute.
- Preserve the existing `ProfileExtractor` interface and shared types.
- The sanitiser runs before every extraction path.

### Tests (`extract.test.ts`)
- The six profile sentences from the brief produce the expected attributes (compare with `shared/fixtures/profiles.ts` where fields overlap).
- `I'm 19, studying BSc, family income is ₹1.2 lakh, from a village` → age 19, UG course value, income 120000, rural (fixture spellings).
- Income formats all give 120000: `1.2 lakh`, `1.2L`, `₹1,20,000`, `Rs. 1,20,000`, `family earns 120000`.
- `age 19, income 120000` → age 19 and income 120000, not swapped.
- Sensitive formats are removed: `987654321`, `9876543210`, `98765-43210`, `123456789012`, `1234 5678 9012`, `1234-5678-9012`; none is parsed as income or age.
- Several sensitive numbers in one sentence are all removed, and the income in the same sentence still parses.
- Unknown text (`hello`) returns empty attributes, not an error.
- The response body never contains the input text.
- Empty or non-string `text` gives 400.

---

## S4b — Client: Home and profile review (Member A's folders only)

### Files
| File | Purpose |
|---|---|
| `client/src/home/HomeScreen.tsx` | Text box, 3 example chips, submit |
| `client/src/home/ProfileReview.tsx` | Editable chips, follow-up questions, "See my scholarships" |
| `client/src/home/api.ts` | `extract(text)`, `evaluate(attributes)` |
| `client/src/locales/en.ts` | New strings (te/hi get the same keys with English placeholders) |
| `client/src/App.tsx` | Route `/` to Home; after evaluation, hand the response to the results route |
| `client/vite.config.ts` | Dev proxy: `/api` → the local server port |

### Behaviour
1. **Home:** one large text box, placeholder "Tell us about yourself: class or course, category, family income, village or city". Three example chips filled from fictional profiles 1, 2 and 5. One primary button. A line below: "No ID numbers needed. Don't type Aadhaar or phone numbers."
2. On submit, call `/api/extract`. Clear the text from state immediately after the call returns; never store it in localStorage.
3. **Profile review:** each attribute as a chip. Tap to edit (dropdown for category, area and course level; number input for income, age and year). Missing important fields show as dashed "Add …" chips.
4. "See my scholarships" calls `/api/evaluate` with the attributes.
5. If `follow_up_questions` is not empty, show up to 3 simple inputs, re-evaluate on answer, and update the chips.
6. Navigate to the results route with the evaluate response. **Do not build the Results screen** (Member B owns `client/src/results`). If B's screen isn't merged yet, the results route shows a temporary plain list of scheme names per group, in `client/src/home/TempResults.tsx`, to be deleted after merge.
7. Store only the attributes (not the text) in localStorage under `haq.profile`.

### Additional integration requirements
- Follow-up questions come only from the API's `follow_up_questions`, and are never asked for an attribute that already has a value.
- Follow-up answers update the attributes, then re-evaluate.
- Use the exact `/api/evaluate` response contract. TempResults renders the `groups` structure as returned and has no eligibility logic of its own.
- Do not add a routing library unless one already exists; use simple state-based navigation.
- Clear the raw text from component state after submission, on both success and failure.
- Persist only extracted and user-corrected attributes under `haq.profile`. Never persist raw text or any response containing it.

### Design
Minimalist: one primary action per screen, theme tokens only, 48px tap targets, works at 360px width. English strings only through `locales/en.ts`.

### Validation
`npm run build` in `client/` passes. Manual check: run server + client, type profile 1's sentence, see chips, edit one, see grouped results.

---

## Next (S5): deploy
One Render web service: build the client, have Express serve `client/dist` and the API from the same origin. Design in `005`.

## Out of scope for S4
Telugu/Hindi extraction, LLM adapter, Results/Scheme screens, tracker, admin, deployment.