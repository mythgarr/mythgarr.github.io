# Browser-Based Lessons: Setup, Limitations & Extending

Two standalone, self-contained HTML files: `led_lessons.html` and `pid_lessons.html`. Each page has a single code editor and a single canvas. Use the **Previous / Next** buttons to move through that lesson's concepts — the instructions and starter code swap automatically, and the canvas resets so leftover animation from the last concept doesn't linger. Every concept's code is created once when the page loads, so a student's edits to an earlier concept are still there if they navigate back to it later.

## How students open it
Just double-click the `.html` file, or host it anywhere static (a school Google Drive folder with "anyone with the link," GitHub Pages, a USB stick). No installation, no accounts. **Chrome or Edge is recommended** — Pyodide (the in-browser Python engine) works best there. The first load takes 10–20 seconds while it downloads the Python runtime; after that it's instant for the rest of the class (the browser caches it).

**One requirement:** an internet connection the first time each browser loads the page (to fetch Pyodide from its CDN, ~10MB). If your venue has unreliable Wi-Fi, load the page once on each laptop before class — most browsers will serve it from cache afterward even offline, though this isn't guaranteed on Chromebooks with aggressive cache-clearing policies.

## How it works, briefly
Real `pygame` can't run in a browser tab without a heavy WebAssembly build. Instead, these pages include a small ~200-line stand-in module (never shown to students) that implements just the handful of pygame calls our lessons actually use — `fill`, `draw.rect/circle/line`, keyboard events, a clock — backed directly by an HTML canvas. Each "Run" button re-executes the student's code together with hidden engine code, exactly mirroring the desktop lesson's split between student files and boilerplate. Code editing is handled by Monaco (the editor that powers VS Code), loaded from a CDN, giving real Python syntax highlighting, bracket matching, and auto-indent. I tested the drawing logic, event handling, keyboard routing, and the physics/control loop for every section against a mocked browser environment before shipping this, but I wasn't able to test it in an actual browser from where I built it — please do a full run-through yourself before class.

## PID lesson: two fixes/additions since the first version
- **Angle wraparound.** The error the controller sees is now computed with an angle-wrapping function, so a setpoint that's been nudged around to, say, 720° is correctly treated as identical to 0° — previously the raw difference would have been huge even though the arm was visually already at the target.
- **Adjustable mass.** Once a section is running and the canvas has focus, Up/Down arrow keys change the arm's mass in 0.1kg steps (shown live in the on-screen readout, floor of 0.1kg so it can never hit zero). This gives students a way to see how a heavier "payload" throws off a previously-tuned controller — a nice bridge to the real-world idea that a robot arm's tuning changes depending on what it's carrying.

## Known limitations
- **State carries between runs within a page load.** Since all sections share one Python environment, a function defined in an earlier section technically stays defined even after you move to a new one. Each section's starter code is self-contained, so this shouldn't cause visible problems — but if something behaves strangely, a page refresh gives a clean slate.
- **Only one animation runs at a time.** Clicking Run in a new section automatically stops whichever one was running before — this is intentional, not a bug.
- **Arrow keys only affect the simulation when the code editor isn't focused.** Click the black canvas (not the code editor) before using arrow keys in the PID lessons. This relies on Monaco's internal input handling, which uses a hidden `<textarea>` for keystroke capture — a well-documented, stable part of how Monaco works, but one more thing worth double-checking in your dry run.
- **No code persistence.** Refreshing the page resets all code boxes to their starting versions. If a class writes something worth keeping, have them copy it into a text file.

## Extending this later
- **Add a new concept:** add an entry to the `SEGMENTS` array near the top of the `<script>` block (an `id`, `title`, `instructions`, and starter `code`) — the Previous/Next navigation, model creation, and canvas reset all pick it up automatically.
- **Add a new pygame feature the shim doesn't support yet** (e.g. `pygame.draw.polygon`, images): add a method to the relevant class in the `SHIM_SRC` string, following the pattern of the existing draw methods — each one just translates directly to an HTML canvas 2D context call.
- **If Pyodide stops loading one day:** the version is pinned in the `<script src="...">` tag near the bottom of each file. Check https://pyodide.org for the current stable version number and update it there. The same applies to the Monaco editor version pinned in the other `<script src="...">` tag.
