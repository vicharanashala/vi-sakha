from playwright.sync_api import sync_playwright
from pathlib import Path

# Auth JSON saved alongside this script
AUTH_JSON_PATH = Path(__file__).parent / "auth.json"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

    page.goto("https://tickettool.xyz/transcript/v1/1468832805713875159/1478267814371397672/transcript-closed-0286.html/69ab136f/69a9c1ef/ad84e70eee3a132a47414ca085deb9e49175b2db5a2022a0b3c80085218aa993")

    # Wait for login button
    # Wait until the login button is visible
    login_button = page.get_by_role("button", name=" Login with discord ").first
    login_button.wait_for(state="visible", timeout=60000)


    # Expect popup when clicking login
    with context.expect_page() as popup_info:
        login_button.click(force=True)

    popup = popup_info.value
    popup.wait_for_load_state()

    print("Complete Discord login in popup...")
    input("Press Enter after successful login...")

    context.storage_state(path=str(AUTH_JSON_PATH))
    browser.close()
