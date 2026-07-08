# FRC Python Lessons: Virtual LEDs & a PID Arm

Two 75–90 minute lessons, built for visual/interactive learners. Both run entirely in the browser via `led_lessons.html` and `pid_lessons.html` — no installation, no accounts. Open the file in Chrome, wait 10–20 seconds for it to load, and you're ready to go.

**How the pages work:** each page has one code editor and one canvas. Use the **Previous / Next** buttons at the top to move between the concepts in a lesson — the instructions and starter code update automatically, and the canvas resets so leftover animation from the last concept doesn't linger. Every concept's code is loaded once when the page starts, so if a student navigates away and back, their edits are still there. **Run** executes whatever's currently in the editor; **Stop** halts the animation; **Reset code** reverts just the current concept back to its starting point.

---

## Lesson 1: Virtual LED Strip (Solid → Stripes → Rainbow → Animation)

**Concepts covered:** loops over a list, tuples/lists as data, basic color models (RGB/HSV), functions as reusable steps, using time/frame count to drive animation.

**Why it's relevant:** this is the same code structure you'd write to control a real addressable LED strip on the robot — solid colors, alliance-color patterns, loading/ready animations. If your team put LEDs on the robot this season, this is genuinely useful robot code, not just a toy exercise.

**Materials:** a laptop with a browser (Chrome recommended). Open `led_lessons.html`.

### Initial code (Concept 1: Solid Color)
```python
RED = [255, 0, 0]
GREEN = [0, 255, 0]
BLUE = [0, 0, 255]
YELLOW = [255, 255, 0]
WHITE = [255, 255, 255]
OFF = [0, 0, 0]

def solid_color(led_data, r, g, b):
    for led in led_data:
        led[0], led[1], led[2] = r, g, b

def update(led_data, frame):
    solid_color(led_data, 255, 0, 0)
    # You could also write this using the color constant above:
    # solid_color(led_data, *RED)
```
`led_data` is a list of `[r, g, b]` values — one entry per virtual LED. `update()` is called 60 times per second by the hidden engine; whatever it does becomes what's on screen. The color constants at the top are available in every concept in this lesson, and the commented-out line shows how `*RED` unpacks a 3-value list directly into the `r, g, b` arguments — a small but handy Python trick worth pointing out once here.

### Lesson flow
1. **Solid color (10 min):** Run it as-is. Have students change the RGB values (or swap in `GREEN`, `BLUE`, etc.) and watch it live — instant feedback, low stakes. Ask what happens with a value like `300` or `-10`.
2. **Stripes (15 min):** Click Next. The new starter code adds a `stripes()` function and calls `stripes(led_data, RED, BLUE, 5)`. Ask: what happens if you change `stripe_width`? What if you use two of the other color constants? What if `stripe_width` doesn't divide evenly into 60?
3. **Rainbow (20 min):** Click Next again. Explain HSV briefly (hue = position on a color wheel), then let students change `i * 3` or how fast `frame` increases and predict the effect before running.
4. **Animation / chase (20 min):** One lit pixel scrolls along the strip, called as `chase(led_data, *GREEN, frame // 3)` — another chance to point out the `*GREEN` unpacking trick from Concept 1. Challenge: combine ideas — alternate between `rainbow` and `chase` every few seconds using `if (frame // 180) % 2 == 0:`.
5. **Synthesis challenge (10–15 min):** Click Next to the final concept. Build a "robot status" display: solid green when idle, a chase animation while a game piece is "loading," and a fast rainbow when "ready to score." All the helper functions are already included — students combine them using `frame` ranges.
6. **Wrap-up (5–10 min):** Discuss where this would matter on the real robot. Ask where LEDs already are (or could be added) on this year's robot.

---

## Lesson 2: PID Control with a Simulated Arm

**Concepts covered:** feedback loops, proportional/integral/derivative terms, tuning by observation, why gravity/friction make "just turn the motor on" insufficient — this maps directly onto real arm/elevator mechanisms teams build.

**Why it's relevant:** Arm and elevator mechanisms almost always need a PID controller to hold position against gravity. This simulation lets students feel the difference between P, PI, and PID without risking a real mechanism.

**Materials:** a laptop with a browser (Chrome recommended). Open `pid_lessons.html`.

### Initial code (Concept 1: No Control at All)
```python
def compute_output(error, dt):
    return 0.0
```
`error` is how far off the arm is from the target angle (in radians); `dt` is the time in seconds since this function was last called. The function returns a motor power from -1.0 to 1.0. Right now it always returns 0 — no push, no matter what. Once running, clicking the canvas and pressing the arrow keys lets students control the simulation directly: Left/Right move the target angle, Up/Down change the arm's mass in 0.1kg steps (shown live on screen) — a nice way to demonstrate that a heavier "payload" throws off a previously-tuned controller.

### Lesson flow
1. **No control (5–10 min):** Run it, click the canvas, try the arrow keys — nothing happens. This sets up the motivating question: how do we make the push depend on how far off we are?
2. **P only (20–25 min):** Click Next. Starter code is `kP * error`, clamped to [-1, 1]. The arm should swing toward 90° and settle short of it — a real, visible steady-state gap caused by gravity constantly pulling against a proportional-only response. Have students raise `kP` and watch the gap shrink (then start to overshoot/wobble at high values). Try Up/Down to add mass mid-run and watch the gap change size.
3. **Adding I (20 min):** Click Next. The small persistent gap should now slowly close as the integral term "leans into" the error over time. If `kI` is set too high, students should see overshoot/wobble — a good moment to name **integral windup**.
4. **Adding D (15–20 min):** Click Next. Toggle `kD` between 0 and 0.5 and compare — it should settle with less wobble. Frame D as "slow down when you're approaching fast," like braking before a stop sign rather than at it.
5. **Free tuning challenge (15 min):** Click Next to the final concept. Move the target with Left/Right, hand-tune all three gains, and change the mass with Up/Down mid-run to see how much re-tuning a heavier "payload" demands — the same real-world problem a robot arm faces when it picks up a game piece.
6. **Wrap-up (10 min):** Connect to the real robot — every arm/elevator mechanism fights gravity the same way this simulated one does. Ask what would happen if `kP` were tuned way too high on a real mechanism (violent oscillation) — a good safety discussion for why tuning starts small and increases gradually on real hardware.

---

## Mentor Notes
- Encourage students to guess the effect of a change *before* running it — that prediction habit is the core skill that transfers to debugging real robot code.
- If a section is running long, trim your own explanation time before trimming the hands-on Explore/tuning time — students remember what they typed and broke themselves far more than what you told them.
- Both pages keep each concept's edits in memory as students move between them with Previous/Next, but refreshing the page resets everything to the starting code — have students copy out anything worth keeping.
- See `browser_lessons_README.md` for setup details, known limitations, and how to extend either page with more concepts later.
