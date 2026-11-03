# CLAUDE.md — ระบบจัดซื้อยาและเวชภัณฑ์ โรงพยาบาลราชวิถี 2 (รังสิต)

Context for any Claude Code session that opens this repo (the owner works from more than one PC; local memory does not travel with the repo, this file does).

## People
- **Owner:** ภญ.ธมลวรรณ จันทร์แก้ว (GitHub `Tamonwan-chan`), pharmacist. She relays requests from and questions to **พี่โอม** (ภก.สุทธิพงษ์ เดชก้อง), the procurement pharmacist who uses the program.
- Any Thai text written for her or for พี่โอม uses the feminine particles **ค่ะ / คะ**, never ครับ.
- Don't guess requirements: if something is ambiguous, ask (in Thai, for her to forward). Record every question and answer in `ประเด็นที่รอยืนยันจากพี่โอม.md`.

## What the app is
- One self-contained page: `mockup/dashboard-mockup.html` (vanilla ES5-style JS, SheetJS 0.18.5 from cdnjs; ExcelJS 4.4.0 is lazy-loaded only for quote export).
- Live on GitHub Pages: https://tamonwan-chan.github.io/Procurement-RJ-2-Dashboard/mockup/dashboard-mockup.html (repo is public).
- พี่โอม drags HIS Excel exports onto the page; each file type is recognised from its column headers (`detectSlot`). Everything runs in the browser; imported data, the KPI table, quote history and next quote numbers are stored in the browser's IndexedDB (`rj2-procurement-dashboard`) on that PC only.
- `guide/index.html` is a Thai user guide. `README.md` documents the files and calculation rules.

## Folder map
```
mockup/dashboard-mockup.html   the program (path is the live Pages URL: never move or rename)
mockup/logo-rj2.jpg            logo, set in BRAND
guide/index.html               Thai user guide (Pages)
tests/                         headless harness: harness.js (load page, drop files), smoke.js
.claude/commands/              /line-triage
.vscode/extensions.json        recommended VS Code extensions (GitLens, GitHub Issues, Live Preview, Markdown All in One)
ประเด็นที่รอยืนยันจากพี่โอม.md      Q&A log with พี่โอม (questions, answers, changes)
ข้อความถึงพี่โอม (รอส่ง).md         next LINE message she has not sent yet
ICEBOX.md                      requests parked by the v1.0 freeze
ลาก/                           git-ignored, this PC only: exactly the files she selects all (Ctrl + A) and drags
                               onto the page in one go — current HIS exports + DATA Template.xlsx; no subfolders
                               (a dragged folder shows "ไม่รู้จักไฟล์"). Also the default smoke-test set.
เก็บไว้/                        git-ignored, this PC only: everything not dragged every time
  Inventory_status/ปี 68, ปี 69  month-end stock history (dragged once per year folder)
  ตัวอย่างเอกสาร/                 his sample memos (.docx), DATA wb021-040.xlsx, his compiled workbook รายการยาจัดหา (not a HIS export: dropping it with the exports overrides them)
  ไม่ใช้แล้ว/                     Rate_cost, old inventory.xls, duplicates, old drafts
```
Copy `ลาก/` and `เก็บไว้/` by hand between PCs. Keep `ลาก/` flat: a new HIS export goes straight in, replacing the older file of the same type.
Local-only, never commit: `สรุปบทบาทและงานที่ทำ.md` and the stock image (both in `.git/info/exclude`; add them there on a new PC).

## Hard rules
- **Never commit real hospital data.** `.gitignore` blocks `*.xls` / `*.xlsx` / `*.docx` and the whole `ลาก/` folder. Never `git add -f`.
- **`DATA Template.xlsx` contains the head of department's signature** — it must never be committed, published or embedded in the page. It is dropped into the page once and kept only in that PC's IndexedDB.
- Keep the **CREDIT** block and the notice at the top of the HTML intact. Change the program name / logo only through `BRAND` in the script.
- Do not publish the watermarked Adobe Stock image `messageImage_1791257146874.jpg` (left untracked on purpose, excluded locally).
- No clasp / Apps Script here. (The sibling folder "Dashboard พี่โอม" is a different project, ME-RJ-2-Dashboard, which does use clasp.)

## Version 1.0 scope freeze (from 2 Nov 2026)
v1.0 = issues #1–#20: 14 closed, 6 waiting on พี่โอม (#4, #5, #8, #9, #11, #16); on 3 Nov his answers closed #4, #5 and #8, so 3 remain (#9, #11, #16). Until those are closed, the program gets **bug fixes only**. She set this up to stop "reflex coding": building each new LINE request the day it arrives while his open questions stay unanswered. The freeze covers program code (`mockup/`, `guide/`). Docs, the Q&A file, `ICEBOX.md` and issues are not frozen.

**Gatekeeper.** Before writing or changing any program code, put the request in one of three categories and state which one in the reply:
- **A. QA bug: fix now.** Something already built fails during his testing: an existing HIS file type is not recognised or fails to import; figures differ from HIS or his slides (box/unit conversion, ED/NED totals, months-of-stock KPI); a broken layout; Thai line breaks, the Garuda or the output are wrong in quote Excel (W / WM / WC) or Word memos (ภย. → ขย. → ย.); IndexedDB loses data; the UI crashes. Follow the Workflow below (`bug` issue, headless tests, `Fixes #n`).
- **B. His answer to one of the 6 issues: build.** Only when she passes on his answer, or she explicitly says to apply the default rule below. Record the answer in the Q&A file first.
- **C. New feature or change: no code.** Anything outside #1–#20: a new HIS file type, chart, document template or calculation; changes to a working screen or workflow that are preference, not a defect. Reply:
  > ⚠️ **SCOPE FREEZE:** this is a new request outside v1.0. Not building it now. Logged in `ICEBOX.md`; new features resume once the remaining open issues are closed.

  Then add it to `ICEBOX.md` (date, his request in neutral words, no real data). Open no GitHub issue for it yet. Only an explicit "lift the freeze for this item" from her overrides this; note the exception in `ICEBOX.md`.
- **Unsure whether A or C?** Don't guess. Ask her (in Thai, to forward) for a QA report: which screen, which file and month, what the program shows, what it should show (HIS figure or slide), and a screenshot.

**The blocked issues (3 left: #9, #11, #16).** Deadline for his answers: **9 Nov 2026 (9 พ.ย. 69)**. From then on, remind her at the start of a session; once she says to go ahead, apply the default: record "ไม่ได้รับคำตอบภายใน 9 พ.ย. 69 จึงใช้ตามที่โปรแกรมทำอยู่" in the Q&A file and close the issue. Anything that can't be built without his files or figures moves to `ICEBOX.md` instead. The defaults are the program's current behaviour (Q&A section 1, column "ตอนนี้ในโปรแกรม"):

| Issue | Waiting on (Q&A section 1 item) | Default after the deadline |
|---|---|---|
| #9 planfin 69 ฉบับหลังปรับแผน | which revision round the file is, units of a few items (1; partly answered 3 Nov) | show the file as it is; close |
| #11 บันทึก Word: ข้อที่รอยืนยัน | items 3 (what "ไม่เกิน planfin" compares), 11, 14 (4, 5, 6, 8 answered 3 Nov) | userate rounded and editable, not checked against planfin; source = quote history (no Excel import); ดีทแฮล์ม = DKSH layout; ย. / ยว. one layout; ex-VAT = ÷ 1.07; close |
| #16 ซ่อนส่วนในกราฟ GPSC / GPU | anything else to hide for the executive presentation (13) | hide nothing more; close |

Q&A items 9 (3 fiscal years of stock history) and 12 (split quotes by manufacturer) have no issue. Same deadline, same default (keep current behaviour). v1.0 closes when all of them are closed. Then the `ICEBOX.md` items become issues for the next version, in the order she chooses.

**LINE messages.** When she pastes a message from พี่โอม, use `/line-triage <message>` (`.claude/commands/line-triage.md`). It sorts each point into A / B / C, records answers, logs C items in `ICEBOX.md` and drafts a Thai LINE reply. Every reply to him thanks him for testing and invites QA reports with the short form in that command. Bugs are fixed first, so reporting one gets a quick result.

## Workflow
1. `git fetch` and check status first (work happens on several PCs).
2. Edit `mockup/dashboard-mockup.html` (small, targeted edits; match the surrounding ES5 style and Thai comments).
3. Test headlessly before pushing: `cd tests && npm install` once per PC, then `node smoke.js` (drops every HIS export at the top of `ลาก/`, ~10 s; lists each slot's row count, exits 1 on a script error or an unrecognised file) or `node smoke.js <files…>`. For a specific check, write a throwaway script in the session scratchpad that does `require('<repo>/tests/harness')`: `load()` gives a fresh page + empty IndexedDB, `page.drop(paths)` imports like a real drop, then inspect `page.document` (the SheetJS cross-realm shim is built in). Don't commit checks that print real figures. Use real Chrome via puppeteer-core for visuals / export. Quote output can be checked by opening it in Excel.
4. Commit with a clear message, push to `master`, wait for the Pages build, then tell her to press Ctrl + F5.
5. Update `ประเด็นที่รอยืนยันจากพี่โอม.md` (open questions, answers, changes) and `README.md` when rules change.
6. Track work in **GitHub Issues** (`gh issue list`): one issue per feature / bug / open question, short neutral Thai title, labels `enhancement` / `bug` / `question` + `waiting` (blocked on พี่โอม's answer or files), milestone "Phase 2: บันทึก ภย. / ภว. / ขย. / ย.". The repo is public, so issues hold no real data, prices, figures or names; details stay in the Q&A file. พี่โอม never uses GitHub: she relays his messages and Claude opens / updates the issues. Close them from the commit (`Fixes #n`). During the v1.0 freeze, new feature requests go to `ICEBOX.md`, not to issues.
7. Days worked on the project = distinct commit dates (weekend dates are hospital shifts and count): `git log --format=%ad --date=short | sort -u | wc -l`. After every push, rerun it; each time it reaches a multiple of **20** (20 reached 2026-11-02; next 40, 60, …), tell her plainly in that reply (she asked to be notified, on whichever PC she is using).

## Key business rules (details in the .md and README)
- Items join on meditem = hospcode = รหัสเวชภัณฑ์ = hospdrugid. Central stock (inventory_exp) is in boxes; dispensing rooms are in units ÷ packqty.
- Dispensing (dispen_inven) counts by dispense type, column H `name`: every type except เบิกฉุกเฉิน (115, clears borrowed drugs), จ่ายทั่วไป (101), ปรับยอดคงคลัง (120) and จำหน่ายออก; แลกเปลี่ยน (returns to the supplier) is counted; value = payqty × unitcost.
- PO_inven counts only `minptype` 101 รับจากการสั่งซื้อ (the real export has five columns all named `name`; supplier = `company_dspname`, else `note`).
- Stock history: every inventory_exp and Inventory_status import is stored per month (`_stockhist` in IndexedDB, current fiscal year + 2 before, so two full years stay comparable early in a new year) for the year-comparison report; a file dated older than the current one is kept as history only. Inventory_status files (Feb 68 – Sep 69) live in `เก็บไว้/Inventory_status/`.
- เดือนสำรองคงคลัง = drug-only stock value at month end ÷ dispensed value; KPI ≤ 1.33; line green ≤ 1.33, orange ≤ 2.00, red > 2.00, plus mean line.
- GPU chart = PO_inven purchase value since fiscal-year start, ฿500,000 ceiling, planfin totals by GPU at the bar end.
- planfin: latest year drives "ห้ามซื้อเกิน", quote prices (cost per box) and the GPU chart; up to 5 years kept; the ranking has a free year / compare-year picker.
- Quotes: one sheet per distributor, max 8 items; numbers W (drugs) / WM (non-drug supplies, materials, others) / WC (pharmaceutical chemicals), format `W001-70`, rolling to the new fiscal year automatically; reopen-to-edit keeps the same number.
- Purchase memos (Word): from a quote in the history, ภย./ภว. → ขย./ขว. → ย./ยว. (W / WB / WC → ย-series, WM → ว-series; the memo screen shows plan budget left = planfin − PO_inven 101 received, per pot); committee and signers are picked per memo from a people list kept only in IndexedDB (`_memoset`) — never put staff names in code or the repo; the Garuda comes from an old memo .docx dropped once. Details and the .docx gotchas (Thai line breaking) are in README.
- Fiscal year starts in October (พ.ศ.).
