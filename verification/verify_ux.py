import asyncio
from playwright.async_api import async_playwright
import os

async def verify_ux_changes():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})

        try:
            await page.goto("http://localhost:5173")

            # 1. Boot System
            print("Waiting for Boot System button...")
            boot_button = page.get_by_role("button", name="Boot System")
            await boot_button.wait_for(state="visible", timeout=10000)
            await boot_button.click()

            # 2. Wait for Login Screen
            print("Waiting for Login Screen...")
            await page.wait_for_selector("text=Authenticate", timeout=20000)

            # 3. Enter as Guest
            print("Clicking Enter as Guest...")
            guest_button = page.get_by_role("button", name="Enter as Guest")
            await guest_button.click()

            # 4. Wait for Desktop/Taskbar
            print("Waiting for Taskbar...")
            # Use get_by_role instead of selector
            launcher_btn = page.get_by_role("button", name="App Launcher")
            await launcher_btn.wait_for(state="visible", timeout=20000)

            # 5. Verify App Launcher Button
            print(f"Found App Launcher button: {await launcher_btn.is_visible()}")

            # 6. Verify descriptive labels on dock apps
            files_btn = page.get_by_role("button", name="Files")
            print(f"Found Files dock button: {await files_btn.is_visible()}")

            # 7. Click App Launcher and verify inner buttons
            await launcher_btn.click()
            print("Clicked App Launcher")
            await page.wait_for_selector("text=Launcher", timeout=10000)

            # Check for Settings in launcher (should have title or aria-label)
            # The one in the launcher footer is more specific
            settings_btns = page.get_by_role("button", name="Settings")
            print(f"Settings buttons count: {await settings_btns.count()}")

            # 8. Open a window and verify its controls
            # Close launcher first or just click Terminal
            terminal_btn = page.get_by_role("button", name="Terminal").first
            await terminal_btn.click()
            print("Opened Terminal")
            await page.wait_for_selector("text=Terminal", timeout=10000)

            # The close button has aria-label="Close Terminal"
            close_btn = page.get_by_role("button", name="Close Terminal")
            await close_btn.wait_for(state="visible", timeout=5000)
            print(f"Found Close button on Terminal: {await close_btn.is_visible()}")

            # Take a screenshot
            await page.screenshot(path="verification/ux_verification.png")
            print("Screenshot saved to verification/ux_verification.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            await page.screenshot(path="verification/error_screenshot.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ux_changes())
