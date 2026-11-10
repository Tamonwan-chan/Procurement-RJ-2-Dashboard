# CLAUDE.md — ระบบจัดซื้อยาและเวชภัณฑ์ โรงพยาบาลราชวิถี 2 (รังสิต)

Context for any Claude Code session that opens this repo (the owner works from more than one PC; local memory does not travel with the repo, this file does).

## People
- **Owner:** ภญ.ธมลวรรณ จันทร์แก้ว (GitHub `Tamonwan-chan`), pharmacist. She relays requests from and questions to **พี่โอม** (ภก.สุทธิพงษ์ เดชก้อง), the procurement pharmacist who uses the program.
- Any Thai text written for her or for พี่โอม uses the feminine particles **ค่ะ / คะ**, never ครับ.
- Don't guess requirements: if something is ambiguous, ask (in Thai, for her to forward). Record every question and answer in `ประเด็นที่รอยืนยันจากพี่โอม.md`.

## What the app is
- One self-contained page: `mockup/dashboard-mockup.html` (vanilla ES5-style JS, SheetJS 0.18.5 from cdnjs; ExcelJS 4.4.0 is lazy-loaded only for quote export).
- Live on GitHub Pages: https://tamonwan-chan.github.io/Procurement-RJ-2-Dashboard/mockup/dashboard-mockup.html (repo is public).
- พี่โอม drags HIS Excel exports onto the page; each file type is recognised from its column headers (`detectSlot`). Everything runs in the browser; imported data, the KPI table, quote history and next quote numbers are stored in the browser's IndexedDB (`rj2-procurement-dashboard`) on that PC only (quote numbers also in `localStorage`). The "สำรองข้อมูล" button saves the hand-entered part to a .json file; it must never include `quoteTpl` (the signature).
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

## Version status
**v1.0 closed on 5 Nov 2026** (issues #1–#20, git tag `v1.0`). His last answer closed #16: hide nothing more. The scope freeze of 2 Nov is over.

**v2.0 is in progress** (milestone "v2.0"). Scope she set on 5 Nov: the รย. ตรวจรับ memo (#34) and a few minor requests from พี่โอม, after which he starts using the program in real procurement. He said on 5 Nov that the statistics are complete and only document format remains, so treat chart and report changes as C unless they are bugs. Real use has already started with ภย. (5 Nov): budget is expected the week of 9 Nov and the first inspections at the end of Nov 2026, so รย. must be usable by then. Order she set on 6 Nov: first finish the exported document format and the document-type changes under the new rules, then build zip import and the collapsing file-status panel (#39). Pushes to `master` reach his real work at once, so follow the branch rule in the Workflow. Still needed: which Excel file #32 means (asked 6 Nov). รย. from a single delivery is built; #34 stays open for his Word check of the test files, the document date and the numbering (Q&A item 18); he confirmed each ย. is delivered in one round. `pono` and `invdate` are empty in HIS (no ERP link), so no PO number link exists: the user picks a delivery by `minpno`.

**Requests closed 9 Nov 2026, then UAT.** She agreed with him: everything he asked for up to 9 Nov goes into v2.0 and gets finished; questions are batched into one message and may be answered later; bugs are fixed at once, before and during UAT; new functions / features after 9 Nov go to `ICEBOX.md` for the next version. Build on `v2`, test, merge to `master` once before UAT (tag it). The 9 Nov list (Q&A 2.32, questions 23–25), in order: (1) bug: line above the filler row in the ขย. / ขว. table, on `master`; (2) WC back to ภว. / ขว. / ยว. and the non-drug budget; (3) KPI chart year tag "ปีงบ 68"; (4) two new signer roles หัวหน้าเจ้าหน้าที่พัสดุ / ประธานกรรมการตรวจรับ; (5) test loading an exported W .xlsx on a fresh page, then send him the explanation. The combined question message is not sent yet; it also carries #32.

**Handling a request.** Before writing or changing any program code, say which category it falls in:
- **A. Bug: fix now.** Something already built fails: an existing HIS file type is not recognised or fails to import; figures differ from HIS or his slides; a broken layout; wrong output in quote Excel or Word memos; IndexedDB loses data; the UI crashes. Follow the Workflow below (`bug` issue, headless tests, `Fixes #n`).
- **B. In v2.0 scope, or his answer to an open question: build.** Record any answer in the Q&A file first.
- **C. Anything else new: no code yet.** Add it to `ICEBOX.md` (date, his request in neutral words, no real data). She chooses what moves to an issue and when. She set this up to stop "reflex coding": building each new LINE request the day it arrives.
- **Unsure whether A or C?** Don't guess. Ask her (in Thai, to forward) for a QA report: which screen, which file and month, what the program shows, what it should show (HIS figure or slide), and a screenshot.

**Must not be forgotten (she asked for this on 4 Nov; don't rely on her remembering).** One follow-up is still an issue: #32, where the อยู่ในแผน / เกินแผน check goes (he said Excel, not Word; asked 6 Nov which file). #33 closed 6 Nov: `userate` is close to normal dispensing averaged over the latest 4 months, so it runs above the 12-month average when recent months are high; the program keeps using it. Raise #32 yourself:
- until it is closed, whenever v2.0 scope or real-use readiness comes up;
- whenever พี่โอม or she mentions the plan check, เกินแผน, `userate` or usage rates, even in passing: say the follow-up exists and offer to deal with it.

**LINE messages.** When she pastes a message from พี่โอม, use `/line-triage <message>` (`.claude/commands/line-triage.md`). It sorts each point into A / B / C, records answers, logs C items in `ICEBOX.md` and drafts a Thai LINE reply. Every reply to him thanks him for testing and invites QA reports with the short form in that command. Bugs are fixed first, so reporting one gets a quick result.

## Workflow
**Branches (she decided 5 Nov 2026).** `master` is the live page พี่โอม works on; GitHub Pages publishes only `master`. New features go on the `v2` branch and reach `master` only after testing, by merging when she says to. Bug fixes and docs go straight on `master`; afterwards merge `master` into `v2` so the fix isn't lost.

1. `git fetch` and check status and the current branch first (work happens on several PCs).
2. Edit `mockup/dashboard-mockup.html` (small, targeted edits; match the surrounding ES5 style and Thai comments).
3. Test headlessly before pushing: `cd tests && npm install` once per PC, then `node smoke.js` (drops every HIS export at the top of `ลาก/`, ~10 s; lists each slot's row count, exits 1 on a script error or an unrecognised file) or `node smoke.js <files…>`. For a specific check, write a throwaway script in the session scratchpad that does `require('<repo>/tests/harness')`: `load()` gives a fresh page + empty IndexedDB, `page.drop(paths)` imports like a real drop, then inspect `page.document` (the SheetJS cross-realm shim is built in). Don't commit checks that print real figures. Use real Chrome via puppeteer-core for visuals / export. Quote output can be checked by opening it in Excel.
4. Commit with a clear message and push the branch. If it is on `master` (or a merge to it), wait for the Pages build, then tell her to press Ctrl + F5.
5. Update `ประเด็นที่รอยืนยันจากพี่โอม.md` (open questions, answers, changes) and `README.md` when rules change.
6. Track work in **GitHub Issues** (`gh issue list`): one issue per feature / bug / open question, short neutral Thai title, labels `enhancement` / `bug` / `question` + `waiting` (blocked on พี่โอม's answer or files), milestone "v2.0". The repo is public, so issues hold no real data, prices, figures or names; details stay in the Q&A file. พี่โอม never uses GitHub: she relays his messages and Claude opens / updates the issues. Close them from the commit (`Fixes #n`). New requests outside the v2.0 scope go to `ICEBOX.md`, not to issues, until she picks them.
7. Days worked on the project = distinct commit dates (weekend dates are hospital shifts and count): `git log --format=%ad --date=short | sort -u | wc -l`. After every push, rerun it; each time it reaches a multiple of **20** (20 reached 2026-11-02; next 40, 60, …), tell her plainly in that reply (she asked to be notified, on whichever PC she is using).

## Key business rules (details in the .md and README)
- Items join on meditem = hospcode = รหัสเวชภัณฑ์ = hospdrugid. Central stock (inventory_exp) is in boxes; dispensing rooms are in units ÷ packqty, taken from inventory_exp, then the latest PO_inven type 101, the latest dispen_inven, Meditem, DrugCatNow (`packOf`; Meditem and DrugCatNow are wrong for some items, #41).
- Dispensing (dispen_inven) counts by dispense type, column H `name`: every type except เบิกฉุกเฉิน (115, clears borrowed drugs), จ่ายทั่วไป (101), ปรับยอดคงคลัง (120) and จำหน่ายออก; แลกเปลี่ยน (returns to the supplier) is counted; value = payqty × unitcost.
- PO_inven counts only `minptype` 101 รับจากการสั่งซื้อ (the real export has five columns all named `name`; supplier = `company_dspname`, else `note`).
- Stock history: every inventory_exp and Inventory_status import is stored per month (`_stockhist` in IndexedDB, current fiscal year + 2 before, so two full years stay comparable early in a new year) for the year-comparison report; a file dated older than the current one is kept as history only. Inventory_status files (Feb 68 – Sep 69) live in `เก็บไว้/Inventory_status/`.
- เดือนสำรองคงคลัง = drug-only stock value at month end ÷ dispensed value; KPI ≤ 1.33; line green ≤ 1.33, orange ≤ 2.00, red > 2.00, plus mean line.
- GPU chart = PO_inven purchase value since fiscal-year start, ฿500,000 ceiling, planfin totals by GPU at the bar end.
- planfin: latest year drives "ห้ามซื้อเกิน", quote prices (cost per box) and the GPU chart; up to 5 years kept; the ranking has a free year / compare-year picker.
- Quotes: one sheet per distributor, max 8 items; numbers W (drugs) / WM (non-drug supplies, materials, others) / WC (pharmaceutical chemicals), format `W001-70`, rolling to the new fiscal year automatically; reopen-to-edit keeps the same number.
- Purchase memos (Word): from a quote in the history, ภย./ภว. → ขย./ขว. → ย./ยว. (W / WB / WC → ย-series, WM → ว-series; the memo screen shows plan budget left = planfin − PO_inven 101 received, per pot); committee and signers are picked per memo from a people list kept only in IndexedDB (`_memoset`) — never put staff names in code or the repo; the Garuda comes from an old memo .docx dropped once. Details and the .docx gotchas (Thai line breaking) are in README.
- Inspection memos (Word): รย. follows ย. (drugs, chemicals), รยว. follows ยว. (non-drug), 1 รย. = 1 ย.; picked from PO_inven 101 by `minpno`, independent of the quote history; details in README.
- Fiscal year starts in October (พ.ศ.).
