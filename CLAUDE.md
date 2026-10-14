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

## Hard rules
- **Never commit real hospital data.** `.gitignore` blocks `*.xls` / `*.xlsx` everywhere. Data files live in the git-ignored `ลาก/` folder.
- **`DATA Template.xlsx` contains the head of department's signature** — it must never be committed, published or embedded in the page. It is dropped into the page once and kept only in that PC's IndexedDB.
- Keep the **CREDIT** block and the notice at the top of the HTML intact. Change the program name / logo only through `BRAND` in the script.
- Do not publish the watermarked Adobe Stock image `messageImage_1791257146874.jpg` (left untracked on purpose).
- No clasp / Apps Script here. (The sibling folder "Dashboard พี่โอม" is a different project, ME-RJ-2-Dashboard, which does use clasp.)

## Workflow
1. `git fetch` and check status first (work happens on several PCs).
2. Edit `mockup/dashboard-mockup.html` (small, targeted edits; match the surrounding ES5 style and Thai comments).
3. Test headlessly before pushing: jsdom + fake-indexeddb + xlsx (cross-realm shim `XLSX.read(Buffer.from(new Uint8Array(d)), …)`), and real Chrome via puppeteer-core for visuals / export. Quote output can be checked by opening it in Excel.
4. Commit with a clear message, push to `master`, wait for the Pages build, then tell her to press Ctrl + F5.
5. Update `ประเด็นที่รอยืนยันจากพี่โอม.md` (open questions, answers, changes) and `README.md` when rules change.

## Key business rules (details in the .md and README)
- Items join on meditem = hospcode = รหัสเวชภัณฑ์ = hospdrugid. Central stock (inventory_exp) is in boxes; dispensing rooms are in units ÷ packqty.
- Dispensing (dispen_inven) counts by dispense type, column H `name`: every type except เบิกฉุกเฉิน (115, clears borrowed drugs), จ่ายทั่วไป (101) and ปรับยอดคงคลัง (120); value = payqty × unitcost.
- PO_inven counts only `minptype` 101 รับจากการสั่งซื้อ (the real export has five columns all named `name`; supplier = `company_dspname`, else `note`).
- Stock history: every inventory_exp import is stored per month (`_stockhist` in IndexedDB, 2 fiscal years) for the year-comparison report; a file dated older than the current one is kept as history only.
- เดือนสำรองคงคลัง = drug-only stock value at month end ÷ dispensed value; KPI ≤ 1.33; line green ≤ 1.33, orange ≤ 2.00, red > 2.00, plus mean line.
- GPU chart = PO_inven purchase value since fiscal-year start, ฿500,000 ceiling, planfin totals by GPU at the bar end.
- planfin: latest year drives "ห้ามซื้อเกิน", quote prices (cost per box) and the GPU chart; up to 2 years kept for the ranking comparison.
- Quotes: one sheet per distributor, max 8 items; numbers W (drugs) / WM (non-drug supplies, materials, others) / WC (pharmaceutical chemicals), format `W001-70`, rolling to the new fiscal year automatically; reopen-to-edit keeps the same number.
- Fiscal year starts in October (พ.ศ.).
