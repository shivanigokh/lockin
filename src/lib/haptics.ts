"use client";
/**
 * Small haptic taps when something finishes.
 *
 * Android and other Chromium browsers support navigator.vibrate. iOS Safari
 * doesn't, but since iOS 18 toggling a native `<input type="checkbox" switch>`
 * plays the system "tick", so we keep one hidden switch around and flip it.
 * Everything here is a silent no-op where neither is available, and respects
 * the OS "reduce motion" setting.
 */
export type Haptic = "tap" | "success" | "error";

const VIBRATE: Record<Haptic, number | number[]> = {
  tap: 8,
  success: [12, 70, 18],
  error: [30, 50, 30, 50, 30],
};
// number of iOS ticks per pattern, and the gap between them
const TICKS: Record<Haptic, number> = { tap: 1, success: 2, error: 3 };
const TICK_GAP_MS = 90;

let iosSwitch: HTMLLabelElement | null = null;

function getIosSwitch() {
  if (iosSwitch?.isConnected) return iosSwitch;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitch = label;
  return label;
}

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function haptic(kind: Haptic = "tap") {
  if (typeof window === "undefined" || reducedMotion()) return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(VIBRATE[kind]);
      return;
    }
    const sw = getIosSwitch();
    for (let i = 0; i < TICKS[kind]; i++) {
      if (i === 0) sw.click();
      else setTimeout(() => sw.click(), i * TICK_GAP_MS);
    }
  } catch {
    // haptics are a nicety; never let them break an action
  }
}
