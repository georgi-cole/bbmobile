#!/usr/bin/env python3
"""
Automated Screenshot Capture Script
Uses Playwright Python to capture screenshots from the test page
"""

import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = 'http://localhost:8090'
SCREENSHOT_DIR = 'test-screenshots/social-maneuvers'

async def capture_screenshots():
    print('🎬 Starting automated screenshot capture...')
    
    # Ensure directory exists
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()
        
        try:
            print('📍 Loading test page...')
            await page.goto(f'{BASE_URL}/test_game_progression_social_automated.html')
            await page.wait_for_load_state('networkidle')
            
            # Screenshot 1: Initial page load
            print('📸 Capturing: 01-game-loaded.png')
            await page.screenshot(path=f'{SCREENSHOT_DIR}/01-game-loaded.png', full_page=True)
            
            # Click "Run Full Test" button
            print('🚀 Running full test...')
            await page.click('#btnRunFull')
            
            # Wait for test to progress
            await asyncio.sleep(2)
            
            # Screenshot 2: Test started
            print('📸 Capturing: 02-test-started.png')
            await page.screenshot(path=f'{SCREENSHOT_DIR}/02-test-started.png', full_page=True)
            
            # Wait for phases to complete
            phases = ['intermission', 'hoh', 'nominations', 'veto_comp', 'veto_meeting', 'eviction', 'social_intermission']
            
            for i, phase in enumerate(phases, 1):
                await asyncio.sleep(2)
                print(f'📸 Capturing: 03-phase-{phase}.png')
                await page.screenshot(path=f'{SCREENSHOT_DIR}/03-phase-{phase}.png', full_page=True)
            
            # Wait a bit more for completion
            await asyncio.sleep(3)
            
            # Screenshot: Social phase details
            print('📸 Capturing: 04-social-phase-start.png')
            await page.screenshot(path=f'{SCREENSHOT_DIR}/04-social-phase-start.png', full_page=True)
            
            # Screenshot: Full UI
            print('📸 Capturing: 05-social-ui-full.png')
            await page.screenshot(path=f'{SCREENSHOT_DIR}/05-social-ui-full.png', full_page=True)
            
            # Screenshot: Final state
            print('📸 Capturing: 06-final-state.png')
            await page.screenshot(path=f'{SCREENSHOT_DIR}/06-final-state.png', full_page=True)
            
            print('✅ Screenshot capture complete!')
            print(f'📁 Screenshots saved to: {SCREENSHOT_DIR}')
            
            # List captured screenshots
            print('\n📸 Captured screenshots:')
            for file in sorted(os.listdir(SCREENSHOT_DIR)):
                if file.endswith('.png'):
                    size = os.path.getsize(os.path.join(SCREENSHOT_DIR, file))
                    print(f'  ✓ {file} ({size / 1024:.2f} KB)')
            
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(capture_screenshots())
    print('\n🎉 All done!')
