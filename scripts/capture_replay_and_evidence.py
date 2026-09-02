import time
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

def run():
    out_dir = Path("outputs/screenshots")
    art_dir = Path(r"C:\Users\Mugi\.gemini\antigravity\brain\0accef43-6a89-4581-ab6c-ea3dcbed65ab")
    art_shots_dir = art_dir / "screenshots"

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not Path(chrome_path).exists():
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True
        )
        context = browser.new_context(viewport={"width": 1600, "height": 1050}, device_scale_factor=1.25)
        page = context.new_page()

        # 1. Evidence Ledger
        print("Capturing Evidence Ledger...")
        page.goto("http://localhost:3000/evidence", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)
        
        # Select run in dropdown
        sel = page.query_selector("select")
        if sel:
            options = sel.query_selector_all("option")
            for opt in options:
                val = opt.get_attribute("value")
                if val and "REALM_RUN" in val:
                    sel.select_option(val)
                    time.sleep(2)
                    break
        
        v_btn = page.query_selector("button:has-text('VERIFY CHAIN')")
        if v_btn:
            v_btn.click()
            time.sleep(2)

        # Click on first event row in table
        first_row = page.query_selector("tbody tr")
        if first_row:
            first_row.click()
            time.sleep(1)

        p7 = out_dir / "07_evidence_ledger_sha256.png"
        page.screenshot(path=str(p7))
        shutil.copy(p7, art_dir / "07_evidence_ledger_sha256.png")
        shutil.copy(p7, art_shots_dir / "07_evidence_ledger_sha256.png")
        print("  ✓ Saved 07_evidence_ledger_sha256.png")

        # 2. Deterministic Replay
        print("Capturing Deterministic Replay...")
        page.goto("http://localhost:3000/replay", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)

        r_sel = page.query_selector("select")
        if r_sel:
            r_options = r_sel.query_selector_all("option")
            for opt in r_options:
                val = opt.get_attribute("value")
                if val and "REALM_RUN" in val:
                    r_sel.select_option(val)
                    time.sleep(2)
                    break

        r_btn = page.query_selector("button:has-text('REPLAY & ASSERT DETERMINISM')") or page.query_selector("button:has-text('Execute Deterministic Replay')")
        if r_btn:
            r_btn.click()
            time.sleep(4)

        p8 = out_dir / "08_deterministic_replay_studio.png"
        page.screenshot(path=str(p8))
        shutil.copy(p8, art_dir / "08_deterministic_replay_studio.png")
        shutil.copy(p8, art_shots_dir / "08_deterministic_replay_studio.png")
        print("  ✓ Saved 08_deterministic_replay_studio.png")

        browser.close()
        print("\n🎉 Evidence & Replay Screenshots Captured!")

if __name__ == "__main__":
    run()
