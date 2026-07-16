# Simon Says — Python Lab: Instructor Guide

**Audience:** high school robotics team, little or no Python experience
**Format:** 90 minutes, hands-on, one laptop per student or pair (pairs work better)
**Materials:** the `simon_says_lesson.html` page, a browser, internet access (the page downloads Python and the editor from the web on first load), and ideally headphones or low volume — every board makes sound.

**The arc of the lesson:** students build the classic Simon memory game piece by piece. Every stage introduces exactly one or two new ideas, and every idea gets used again in the next stage. By stage 7 they assemble a complete game out of parts they already understand. The final stage is open-ended remixing for fast finishers.

**Why this maps to robotics:** the game loop they build — *output a pattern → wait for input → compare → decide* — is the sense/decide/act loop of every autonomous robot routine. Say this out loud at least twice during the lesson.

---

## Before the students arrive (10 minutes of prep)

Open the page yourself and click Run on every stage once. The first load takes 10–20 seconds while Python downloads; after that it's instant. Confirm sound works. Play the full game in stage 7 so you have a high score to challenge them with — nothing motivates teenagers like beating the mentor.

Know the safety rails so you can reassure students: the **Stop** button halts anything, including accidental infinite loops; **Reset code** restores the stage's original working code, so nothing they do is unrecoverable; and moving between stages **keeps their edits**, so exploring other stages loses nothing.

One honest caveat to know about: the Stop button works by interrupting the program at loops and waits. In this lesson every example loops or sleeps, so it always works — but a truly pathological one-line calculation could still lag the tab. A browser refresh fixes anything.

---

## Opening (10 min)

Demo first, explain second. Put the page on the projector, jump straight to **stage 7**, and play a round of Simon badly. Lose. Let them laugh. Then say: *"In 90 minutes, every one of you will have built this from scratch — and made a better version."* Jump back to stage 1.

Walk through the screen layout once: lesson panel on the left, code in the middle, the board on the right, output underneath the code. Show Run, Stop, and Reset code. Tell them the cheat sheet at the bottom of the lesson panel lists every board command — they will forget function names, and that's where to look.

---

## Stage 1 — Light it up (10 min)

**The exercise.** Students run six lines that light green then red, then extend it to yellow and blue, change timings, and figure out how to get two pads lit simultaneously.

**Explain.** Three ideas, and only three: code runs top to bottom one line at a time; `light_on("green")` is a *function call* and the quoted color is an *argument*; `sleep(1)` pauses so humans can see what happened. Type one change live — change `"green"` to `"blue"` — and run it, so they see edit → run → observe before touching their own keyboards.

**Explore.** The two-pads-at-once puzzle is the payoff: they must realize you call `light_on` twice *before* any `sleep`. Ask "why did your pads light one after another instead of together?" and let them reason about line order. Try `light_on("purple")` on the projector — the friendly error message teaches them errors are information, not punishment.

**Watch for.** Missing quotes around color names, and students clicking Run twice (the button disables while running — point it out). Someone will ask why the light turns off "instantly" without sleep; that's the hook for the next question: how fast does a computer run a line?

---

## Stage 2 — Loops (10 min)

**The exercise.** Replace repeated lines with a list and a `for` loop using `flash()`, then reverse the order, nest a loop to repeat the show, and make it accelerate.

**Explain.** A list is a box of values in order; the loop takes them out one at a time and puts each in the variable `color`. Trace one full loop by hand on a whiteboard — "first trip through, color is green; second trip, color is red" — this mental model is the single most important thing in the whole lesson. Indentation is Python's way of saying "this belongs to the loop."

**Explore.** The accelerating-flash challenge quietly introduces updating a variable (`speed = speed - 0.1` or `speed = speed * 0.8`). Ask what happens when speed hits zero or goes negative — let them crash it and read the error. Fast students: flash a random color each time.

**Watch for.** Indentation errors are the #1 issue all day — teach "select lines, press Tab / Shift-Tab" in Monaco now and it pays off for an hour. Also the classic nested-loop confusion of reusing the same variable name in both loops.

---

## Stage 3 — Sound and functions (12 min)

**The exercise.** Play pad notes with `beep()`, then define `show(color)` that lights and beeps together, then compose tunes — including with raw frequencies via `tone()`.

**Explain.** This is the conceptual heavyweight of the day: `def` *creates* a function but runs nothing; the indented body runs only when *called*. Analogy that lands with robotics kids: a function is a named subroutine on your driver station — writing the button mapping isn't pressing the button. Emphasize that they just extended the board's vocabulary: `show` is now as real a command as `light_on`.

**Explore.** The parameterized version `def show(color, seconds)` introduces multiple arguments. The `tone()` frequencies invite actual music — give them the note numbers in the comments and two minutes of chaos. It's loud, it's fun, and it's the moment the room decides programming is enjoyable. Cut it off with a countdown or you'll lose five minutes.

**Watch for.** Defining `show` but never calling it ("nothing happened!" — perfect teachable moment), and calling `show` *above* the `def` (name isn't defined yet — reinforces top-to-bottom execution).

---

## Stage 4 — Simon speaks (10 min)

**The exercise.** Play back a pattern stored in a list using their `show()` function, then build the pattern *randomly* with `import random`, a loop, and `.append()`.

**Explain.** The big idea is **separating data from code**: the pattern is data; the playback loop doesn't care what's in it or how long it is. Change the list on the projector without touching the loop. Then introduce `random.choice` as "the computer rolling a die" and `.append` as "adding to the end of the list."

**Explore.** Ask: "how would the real Simon make each game different?" and let them propose randomness before you show the tool. Have students print the random pattern with `print(pattern)` so they can verify what was built — their first taste of debugging by inspection.

**Watch for.** Forgetting `import random`, and appending inside vs. outside the loop (a pattern of one color, five times, is a fun bug to diagnose together).

---

## Stage 5 — Your turn, human (10 min)

**The exercise.** An infinite `while True:` loop that waits for pad clicks, prints and displays each one — then counting presses, breaking after five, and a "secret knock" detector.

**Explain.** Two ideas: `wait_for_press()` *blocks* — the program stands still until input arrives (relate to a robot waiting on a sensor or the start signal); and `while True` is the standard shape of a robot's main loop. Deliberately let the loop run forever and make a show of pressing **Stop** — the kill switch is a legitimate tool, not an admission of failure.

**Explore.** The secret knock is the richest challenge: it needs a counter that increments on red and *resets* on anything else. Ask "how do you know if the last three presses were all red?" and let pairs argue about it. The `break` statement gives them their first taste of controlled loop exit.

**Watch for.** `count == 5` vs `count = 5` — the comparison/assignment mix-up will bite someone here, guaranteed. Also students who put `break` outside the `if` and wonder why the loop ends immediately.

---

## Stage 6 — Right or wrong? (12 min)

**The exercise.** A fixed pattern plays, the player repeats it, and the code judges each press against the expected color — with `clear_presses()` guarding against early clicks.

**Explain.** Walk through the judging loop slowly: for each expected color, wait for one press and compare with `!=`. This zip-two-sequences-together pattern is subtle for beginners; trace it on the board with a 3-color pattern. Then demonstrate the early-click bug live — click pads during the WATCH phase with `clear_presses()` deleted, and watch the game "read your mind." Input buffering is a real embedded-systems gotcha; they'll hit the same thing with joystick inputs on a robot.

**Explore.** Challenge 3 in the code *is* the bug demo — send students to break it themselves. The "how many did they get right" extension requires a counter inside the judging loop, rehearsing stage 5's skill. Win/lose sound design is a good creative outlet for pairs who finish early.

**Watch for.** Confusing the two loop variables (`expected` from the pattern vs. `press` from the player) — good variable names are doing real work here; say so.

---

## Stage 7 — The full game (12 min)

**The exercise.** The complete Simon: a game loop that appends a random color each round, plays the pattern, judges the player, tracks score, and ends on a miss. Students read it, run it, play it, then start tweaking.

**Explain.** Resist the urge to lecture — instead do a **read-through**: cold-call students to explain each numbered section ("what does part 2 do? where have you seen it before?"). Every line comes from an earlier stage; the lesson of stage 7 is that *programs are assembled from small parts you already understand*. Then hold a two-minute high-score tournament. Announce your score from prep. Be dethroned.

**Explore.** The three TRY IT items are ordered: speed-up (arithmetic with `len(pattern)` and `max()`), three lives (a counter plus restructured game-over logic — genuinely hard), rainbow celebration (the modulo operator `%`, if you want to introduce it).

**Watch for.** Students who tweak without predicting. Push the habit: *"tell me what will happen before you press Run."* Prediction-then-test is the debugging discipline that transfers to their robot.

---

## Stage 8 — Level up (remaining time, ~10 min + overflow)

**The exercise.** Open challenges on top of the working game: turbo mode, three lives, a victory jingle, reverse mode (`reversed(pattern)`), and two-player battle.

**How to run it.** This stage is a pressure valve, not a scheduled block — fast finishers can jump here from stage 6 onward, and it's the natural home for anyone with time left at the end. Let pairs pick one challenge and demo whatever they got working, broken or not, in the final five minutes. Celebrate the best bug story as loudly as the best feature.

---

## Wrap-up (5 min)

Close the loop to robotics explicitly: they built *output patterns* (LED/sound control), *input handling* (waiting on and buffering button events), a *state-holding game loop*, and *validation logic*. Rename the parts: telemetry, sensor polling, the robot main loop, and autonomous sequencing. Same skills, different costume.

---

## Timing at a glance

| Block | Minutes |
|---|---|
| Opening demo + tour | 10 |
| Stage 1 — Light it up | 10 |
| Stage 2 — Loops | 10 |
| Stage 3 — Sound + functions | 12 |
| Stage 4 — Simon speaks | 10 |
| Stage 5 — Your turn, human | 10 |
| Stage 6 — Right or wrong? | 12 |
| Stage 7 — The full game | 12 |
| Stage 8 + wrap-up | ~14 |
| **Total** | **~90** |

If you're running behind, stage 4's random-pattern challenge and stage 6's extensions are the safest cuts — the core thread survives without them. If you're ahead, stage 8 absorbs any amount of time.

## Tips for a first-time instructor

Pair students and rotate who types every stage — the navigator learns as much as the driver. Never touch a student's keyboard; point at the screen and make them type the fix. When someone hits an error, read it *aloud together* — the line number and message usually contain the answer, and error-reading is the most underrated skill you can teach. Keep a visible "parking lot" list for great questions you can't afford time to answer ("could it save high scores?" "could this run on the real robot?") — those questions are your next lesson.
