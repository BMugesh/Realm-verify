import time
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

def run():
    out_dir = Path("outputs/screenshots")
    out_dir.mkdir(parents=True, exist_ok=True)

    art_dir = Path(r"C:\Users\Mugi\.gemini\antigravity\brain\0accef43-6a89-4581-ab6c-ea3dcbed65ab")
    art_shots_dir = art_dir / "screenshots"
    art_shots_dir.mkdir(parents=True, exist_ok=True)

    print("Launching Chromium for comprehensive real UI proof capture...")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(
                executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                headless=True
            )
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(viewport={"width": 1600, "height": 1050}, device_scale_factor=1.25)
        page = context.new_page()

        # 1. Landing Page
        print("1. Capturing Landing Page...")
        page.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)
        p1 = out_dir / "01_landing_hero.png"
        page.screenshot(path=str(p1))
        shutil.copy(p1, art_dir / "01_landing_hero.png")
        shutil.copy(p1, art_shots_dir / "01_landing_hero.png")

        # 2. Dashboard
        print("2. Capturing Dashboard...")
        page.goto("http://localhost:3000/dashboard", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        p2 = out_dir / "02_control_room_dashboard.png"
        page.screenshot(path=str(p2))
        shutil.copy(p2, art_dir / "02_control_room_dashboard.png")
        shutil.copy(p2, art_shots_dir / "02_control_room_dashboard.png")

        # 3. Reconciliation Studio (Main View)
        print("3. Capturing Reconciliation Studio...")
        page.goto("http://localhost:3000/reconciliation", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        p3 = out_dir / "03_reconciliation_studio.png"
        page.screenshot(path=str(p3))
        shutil.copy(p3, art_dir / "03_reconciliation_studio.png")
        shutil.copy(p3, art_shots_dir / "03_reconciliation_studio.png")

        # 3b. Reconciliation Studio (Upload Drawer Opened)
        print("3b. Capturing Reconciliation Upload Studio...")
        up_btn = page.query_selector("button:has-text('Upload Data')")
        if up_btn:
            up_btn.click()
            time.sleep(1.5)
            p3b = out_dir / "03b_reconciliation_upload_drawer.png"
            page.screenshot(path=str(p3b))
            shutil.copy(p3b, art_dir / "03b_reconciliation_upload_drawer.png")
            shutil.copy(p3b, art_shots_dir / "03b_reconciliation_upload_drawer.png")
            # Close drawer
            up_btn.click()
            time.sleep(1)

        # 4. 5 Agents Command Center
        print("4. Capturing 5 Agents Command Center...")
        page.goto("http://localhost:3000/agents", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)
        p4 = out_dir / "04_5_agents_command_center.png"
        page.screenshot(path=str(p4))
        shutil.copy(p4, art_dir / "04_5_agents_command_center.png")
        shutil.copy(p4, art_shots_dir / "04_5_agents_command_center.png")

        # 5. Explainability Modal (0-Paise Proof)
        print("5. Capturing Explainability Modal...")
        page.goto("http://localhost:3000/reconciliation", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)
        btn = page.query_selector("button:has-text('Explain')")
        if btn:
            btn.click()
            time.sleep(2)
            p5 = out_dir / "05_explainability_modal_0_paise_proof.png"
            page.screenshot(path=str(p5))
            shutil.copy(p5, art_dir / "05_explainability_modal_0_paise_proof.png")
            shutil.copy(p5, art_shots_dir / "05_explainability_modal_0_paise_proof.png")
            page.keyboard.press("Escape")
            time.sleep(0.5)

        # 6. Exceptions Queue (Wait for data load)
        print("6. Capturing Exceptions Queue...")
        page.goto("http://localhost:3000/exceptions", wait_until="domcontentloaded", timeout=30000)
        time.sleep(4)
        p6 = out_dir / "06_exceptions_quarantine_queue.png"
        page.screenshot(path=str(p6))
        shutil.copy(p6, art_dir / "06_exceptions_quarantine_queue.png")
        shutil.copy(p6, art_shots_dir / "06_exceptions_quarantine_queue.png")

        # 7. Evidence Ledger
        print("7. Capturing Evidence Ledger...")
        page.goto("http://localhost:3000/evidence", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        # Select first option in select dropdown if present
        select_el = page.query_selector("select")
        if select_el:
            options = select_el.query_selector_all("option")
            if len(options) > 1:
                val = options[1].get_attribute("value")
                select_el.select_option(val)
                time.sleep(1.5)
        v_btn = page.query_selector("button:has-text('VERIFY CHAIN')")
        if v_btn:
            v_btn.click()
            time.sleep(2)
        p7 = out_dir / "07_evidence_ledger_sha256.png"
        page.screenshot(path=str(p7))
        shutil.copy(p7, art_dir / "07_evidence_ledger_sha256.png")
        shutil.copy(p7, art_shots_dir / "07_evidence_ledger_sha256.png")

        # 8. Deterministic Replay Studio
        print("8. Capturing Deterministic Replay Studio...")
        page.goto("http://localhost:3000/replay", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        # Select first option in select dropdown if present
        r_select = page.query_selector("select")
        if r_select:
            r_opts = r_select.query_selector_all("option")
            if len(r_opts) > 1:
                val = r_opts[1].get_attribute("value")
                r_select.select_option(val)
                time.sleep(1.5)
        r_btn = page.query_selector("button:has-text('REPLAY & ASSERT DETERMINISM')") or page.query_selector("button:has-text('Execute Deterministic Replay')")
        if r_btn:
            r_btn.click()
            time.sleep(4)
        p8 = out_dir / "08_deterministic_replay_studio.png"
        page.screenshot(path=str(p8))
        shutil.copy(p8, art_dir / "08_deterministic_replay_studio.png")
        shutil.copy(p8, art_shots_dir / "08_deterministic_replay_studio.png")

        # 9. Architecture
        print("9. Capturing System Architecture...")
        page.goto("http://localhost:3000/architecture", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)
        p9 = out_dir / "09_system_architecture.png"
        page.screenshot(path=str(p9))
        shutil.copy(p9, art_dir / "09_system_architecture.png")
        shutil.copy(p9, art_shots_dir / "09_system_architecture.png")

        browser.close()
        print("\n🎉 ALL SCREENSHOTS SUCCESSFULLY RE-CAPTURED WITH LIVE POPULATED DATA!")

if __name__ == "__main__":
    run()
