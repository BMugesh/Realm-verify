import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        headless=True
    )
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    
    print('Navigating to http://localhost:3000/reconciliation...')
    page.goto('http://localhost:3000/reconciliation', wait_until='networkidle')
    time.sleep(2)
    
    print('Clicking Explain button for top row (PO_B01_000001)...')
    explain_btn = page.locator('table button:has-text("Explain")').first
    explain_btn.click()
    
    time.sleep(2)
    page.screenshot(path='outputs/screenshots/live_modal_opened.png')
    
    dialog = page.locator('[role="dialog"]')
    if dialog.is_visible():
        print('\n=== LIVE EXPLAIN MODAL TEXT IN REAL CHROME ===')
        text = dialog.inner_text()
        print(text)
    else:
        print('Dialog locator not matched, checking active elements:')
        print(page.inner_text('body'))

    browser.close()
