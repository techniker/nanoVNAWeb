# V2 Hardware Validation Checklist

This document describes how to manually validate the V2 driver against
real NanoVNA-V2 / V2Plus / V2Plus4 hardware.

## Status

Plan #2 ships V2 driver code that is TDD-tested against scripted byte
fixtures based on the V2 manual (https://nanorfe.com/nanovna-v2-user-manual.html)
and the pynanovnav2 reference implementation. **No runnable harness is
bundled with Plan #2.** Validation becomes possible once a consumer of
the worker exists — either the web app in Plan #7, or a standalone
harness added in a future plan.

## When to run

Before any release that targets real V2 users, run the checklist below
against at least one V2 hardware variant. The driver has not been
proven against real hardware; byte-level protocol details may differ
from the reference.

## Checklist

1. **Connect.** Plug a V2 / V2Plus / V2Plus4 into a USB port. In a
   Chromium browser, load the app and click Connect. Select the
   appropriate serial port.
2. **Variant identification.** The status strip should display the
   correct model name (`NanoVNA-V2`, `NanoVNA-V2Plus`, or
   `NanoVNA-V2Plus4`) matching the device markings or sticker.
3. **Firmware / hardware version.** The Status page (Plan #7+) should
   show firmware version matching whatever is displayed on the device
   itself or via the serial `info` equivalent.
4. **Capability reporting.** Max frequency shown in the UI should
   match the variant:
   - V2 base: 3.0 GHz
   - V2Plus: 4.0 GHz
   - V2Plus4: 4.4 GHz

   S21 trace availability should only appear on Plus / Plus4.
5. **Basic sweep.** Set a 50 MHz – 1.5 GHz sweep, 101 points. Confirm
   frequencies populate linearly; frames arrive at a reasonable rate
   (≥ 10 Hz polled mode).
6. **Known references.**
   - Attach an **open** to CH0. `|S11|` should be close to 0 dB.
   - Attach a **short** to CH0. `|S11|` should be close to 0 dB with
     ~180° phase shift.
   - Attach a **50 Ω load** to CH0. `|S11|` should be well below
     −20 dB (lower is better) across the swept range.
7. **V2Plus / V2Plus4 through.** Attach a known through (CH0 ↔ CH1
     SMA cable). `|S21|` should be close to 0 dB minus cable loss.
8. **Mid-stream sweep change.** While streaming, change sweep range.
   No spurious `disconnected` status should fire; frames should resume
   at the new range within 1–2 sweep cycles.
9. **Clean disconnect.** Click Disconnect. Status transitions
   `connected → disconnected` without a `lost` state.
10. **Reconnect.** Click Connect again on the same port. Probe should
    identify the device again; sweep should resume.

## Known gaps

- **`mode: 'stream'`** is not implemented; only polled mode has been
  tested. `startStream` rejects `mode: 'stream'` with a clear error.
- **Calibration** (SOLT or similar) is not implemented. Apply the
  device's built-in calibration before running validation.
- **Averaging (`SweepParams.averaging`)** is written to the V2
  `VALUES_PER_FREQ` register but not exhaustively tested against real
  hardware. Verify that a value of 4 roughly 4× reduces noise.

## Reporting issues

If validation turns up byte-level mismatches or variant-specific
behaviour the fixtures didn't cover, open an issue with:

- Device variant (V2 / V2Plus / V2Plus4).
- Firmware version and hardware revision from the Status page.
- Concrete observation (expected vs. actual).
- Steps to reproduce against a fresh connect.

Debugging adjustments land in a targeted fix plan, not inline.
