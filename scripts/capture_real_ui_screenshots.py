import time
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

def capture_screenshots():
    project_shots_dir = Path("outputs/screenshots")
    project_shots_dir.mkdir(parents=True, exist_ok=True)
    
    artifact_dir = Path(r"C:\Users\Mugi\.gemini\antigravity\brain\0accef43-6a89-4581-ab6c-ea3dcbed65ab")
    artifact_shots_dir = artifact_dir / "screenshots"
    artifact_shots_dir.mkdir(parents=True, exist_ok=True)

    print(f"Saving screenshots to:\n 1. {project_shots_dir.resolve()}\n 2. {artifact_shots_dir.resolve()}\n")

    with sync_playwright() as p:
        # Launch Chrome / Chromium
        try:
            browser = p.chromium.launch(
                executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                headless=True
            )
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(viewport={"width": 1600, "height": 1000}, device_scale_factor=1.5)
        page = context.new_page()

        # 1. Landing Page
        print("1. Capturing Landing Page...")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        time.sleep(2)
        shot1 = project_shots_dir / "01_landing_hero.png"
        page.screenshot(path=str(shot1), full_page=False)
        shutil.copy(shot1, artifact_shots_dir / "01_landing_hero.png")
        shutil.copy(shot1, artifact_dir / "01_landing_hero.png")

        # 2. Control Room Dashboard
        print("2. Capturing Control Room Dashboard...")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle")
        time.sleep(2)
        shot2 = project_shots_dir / "02_control_room_dashboard.png"
        page.screenshot(path=str(shot2), full_page=False)
        shutil.copy(shot2, artifact_shots_dir / "02_control_room_dashboard.png")
        shutil.copy(shot2, artifact_dir / "02_control_room_dashboard.png")

        # 3. Reconciliation Studio
        print("3. Capturing Reconciliation Studio...")
        page.goto("http://localhost:3000/reconciliation", wait_until="networkidle")
        time.sleep(2)
        shot3 = project_shots_dir / "03_reconciliation_studio.png"
        page.screenshot(path=str(shot3), full_page=False)
        shutil.copy(shot3, artifact_shots_dir / "03_reconciliation_studio.png")
        shutil.copy(shot3, artifact_dir / "03_reconciliation_studio.png")

        # 4. 5-Agent Command Center
        print("4. Capturing 5-Agent Command Center...")
        page.goto("http://localhost:3000/agents", wait_until="networkidle")
        time.sleep(2)
        shot4 = project_shots_dir / "04_5_agents_command_center.png"
        page.screenshot(path=str(shot4), full_page=False)
        shutil.copy(shot4, artifact_shots_dir / "04_5_agents_command_center.png")
        shutil.copy(shot4, artifact_dir / "04_5_agents_command_center.png")

        # 5. Explainability Modal with 0-Paise Proof
        print("5. Capturing Decision Explainability Modal...")
        page.goto("http://localhost:3000/reconciliation", wait_until="networkidle")
        time.sleep(2)
        # Look for Explain button
        explain_btns = page.locator("button:has-text('Explain')")
        if explain_btns.count() > 0:
            explain_btns.first.click()
            time.sleep(1.5)
            shot5 = project_shots_dir / "05_explainability_modal_0_paise_proof.png"
            page.screenshot(path=str(shot5), full_page=False)
            shutil.copy(shot5, artifact_shots_dir / "05_explainability_modal_0_paise_proof.png")
            shutil.copy(shot5, artifact_dir / "05_explainability_modal_0_paise_proof.png")
            # Close modal if open
            page.keyboard.press("Escape")
            time.sleep(0.5)

        # 6. Exceptions Queue
        print("6. Capturing Exceptions Queue...")
        page.goto("http://localhost:3000/exceptions", wait_until="networkidle")
        time.sleep(2)
        shot6 = project_shots_dir / "06_exceptions_quarantine_queue.png"
        page.screenshot(path=str(shot6), full_page=False)
        shutil.copy(shot6, artifact_shots_dir / "06_exceptions_quarantine_queue.png")
        shutil.copy(shot6, artifact_dir / "06_exceptions_quarantine_queue.png")

        # 7. Evidence Ledger
        print("7. Capturing Evidence Ledger...")
        page.goto("http://localhost:3000/evidence", wait_until="networkidle")
        time.sleep(2)
        shot7 = project_shots_dir / "07_evidence_ledger_sha256.png"
        page.screenshot(path=str(shot7), full_page=False)
        shutil.copy(shot7, artifact_shots_dir / "07_evidence_ledger_sha256.png")
        shutil.copy(shot7, artifact_dir / "07_evidence_ledger_sha256.png")

        # 8. Deterministic Replay
        print("8. Capturing Deterministic Replay...")
        page.goto("http://localhost:3000/replay", wait_until="networkidle")
        time.sleep(2)
        # Click Execute Replay if button exists
        replay_btn = page.locator("button:has-text('Execute Deterministic Replay')")
        if replay_btn.count() > 0 and replay_btn.first.is_enabled():
            replay_btn.first.click()
            time.sleep(2)
        shot8 = project_shots_dir / "08_deterministic_replay_studio.png"
        page.screenshot(path=str(shot8), full_page=False)
        shutil.copy(shot8, artifact_shots_dir / "08_deterministic_replay_studio.png")
        shutil.copy(shot8, artifact_dir / "08_deterministic_replay_studio.png")

        # 9. Architecture Overview
        print("9. Capturing System Architecture...")
        page.goto("http://localhost:3000/architecture", wait_until="networkidle")
        time.sleep(2)
        shot9 = project_shots_dir / "09_system_architecture.png"
        page.screenshot(path=str(shot9), full_page=False)
        shutil.copy(shot9, artifact_shots_dir / "09_system_architecture.png")
        shutil.copy(shot9, artifact_dir / "09_system_architecture.png")

        browser.close()
        print("\n🎉 All 9 real UI proof screenshots captured and saved successfully!")

if __name__ == "__main__":
    capture_screenshots()
