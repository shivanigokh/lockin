"use client";
import { useEffect, useRef, useState } from "react";
import { Apple, Check, Copy, KeyRound, Link2, RefreshCw, Smartphone, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/lib/use-action";
import { createIngestToken, disconnectStrava, revokeIngestToken, syncStrava } from "@/app/actions/integrations";
import { relTime } from "@/lib/dates";

type Strava = { athlete_name: string | null; last_synced_at: string | null } | null;
type Key = { created_at: string; last_used_at: string | null } | null;

const STRAVA_STATUS: Record<string, [string, "error" | undefined]> = {
  connected: ["Strava connected. Your recent workouts are in.", undefined],
  cancelled: ["Strava connection cancelled.", "error"],
  "needs-activity": ["Strava needs the “View data about your activities” box ticked. Try again.", "error"],
  "not-configured": ["Strava isn't set up on this server yet (missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET).", "error"],
  error: ["Couldn't connect to Strava. Try again.", "error"],
};

export function ConnectedApps({ strava, stravaReady, ingestKey, ingestUrl, shortcutUrl, status }: { strava: Strava; stravaReady: boolean; ingestKey: Key; ingestUrl: string; shortcutUrl: string | null; status?: string }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current || !status || !STRAVA_STATUS[status]) return;
    shown.current = true;
    toast(...STRAVA_STATUS[status]);
    window.history.replaceState(null, "", "/settings#connected-apps");
  }, [status, toast]);

  return (
    <div className="space-y-6">
      <StravaPanel strava={strava} ready={stravaReady} />
      <div className="border-t border-line/60 pt-5">
        <AppleHealthPanel ingestKey={ingestKey} ingestUrl={ingestUrl} shortcutUrl={shortcutUrl} />
      </div>
    </div>
  );
}

function StravaPanel({ strava, ready }: { strava: Strava; ready: boolean }) {
  const [sync, syncing] = useAction(syncStrava);
  const [disconnect, disconnecting] = useAction(disconnectStrava);
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fc4c02] text-white">
          <Link2 className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">Strava</h3>
      </div>
      {strava ? (
        <>
          <p className="text-sm text-muted">
            Connected{strava.athlete_name ? ` as ${strava.athlete_name}` : ""}. {strava.last_synced_at ? `Last synced ${relTime(strava.last_synced_at)}.` : "Not synced yet."} New activities come in automatically when you open the app.
          </p>
          <p className="mt-2 text-xs text-faint">
            Strava workouts are saved as <b>private</b>: Strava&apos;s rules only let us show your Strava data to you. Want one in your squad feed? Edit it in My workouts and switch it to shared.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={syncing} onClick={() => sync({})}>
              <RefreshCw className="h-4 w-4" /> Sync now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          </div>
          <Modal open={confirm} onClose={() => setConfirm(false)} title="Disconnect Strava?">
            <p className="mb-4 text-sm text-muted">This removes our access on Strava and deletes the workouts that came from Strava. Workouts you logged yourself stay.</p>
            <div className="flex gap-2">
              <Button variant="danger" loading={disconnecting} onClick={() => disconnect().then((r) => r.ok && setConfirm(false))}>
                Disconnect
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </Modal>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Pull in runs, rides, swims and gym sessions automatically. <b>Apple Watch tip:</b> in the Strava iPhone app, turn on Settings &rarr; Applications, Services, and Devices &rarr; Health, and your Apple Watch workouts flow through Strava into here.
          </p>
          {ready ? (
            <a href="/api/strava/connect" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#fc4c02] px-3.5 text-[13px] font-semibold text-white transition hover:brightness-110">
              Connect with Strava
            </a>
          ) : (
            <p className="mt-2 text-xs text-faint">Not available yet: the app owner needs to add Strava API keys.</p>
          )}
        </>
      )}
    </div>
  );
}

function AppleHealthPanel({ ingestKey, ingestUrl, shortcutUrl }: { ingestKey: Key; ingestUrl: string; shortcutUrl: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const toast = useToast();
  const copy = (v: string, msg = "Copied.") =>
    navigator.clipboard?.writeText(v).then(
      () => toast(msg),
      () => toast("Couldn't copy. Long-press the key to copy it.", "error"),
    );
  const [make, making] = useAction(createIngestToken, {
    onSuccess: (d) => {
      if (!d?.token) return;
      setToken(d.token);
      copy(d.token, "Sync key copied. Paste it when the Shortcut asks.");
    },
  });
  const [revoke, revoking] = useAction(revokeIngestToken, { onSuccess: () => setToken(null) });
  const hasKey = Boolean(ingestKey || token);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#141218]">
          <Apple className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">Apple Health</h3>
      </div>
      <p className="text-sm text-muted">
        Sends your <b>daily calories</b> from Apple Health (including food apps like HealthifyMe that write to it) to your private vault. Your iPhone asks before anything is added or shared.
      </p>

      {shortcutUrl ? (
        <ol className="mt-4 space-y-4">
          <Step n={1} title="Get your sync key" done={hasKey}>
            {token ? (
              <KeyBox token={token} onCopy={() => copy(token)} />
            ) : ingestKey ? (
              <p className="text-xs text-faint">
                Key active since {relTime(ingestKey.created_at)}. {ingestKey.last_used_at ? `Last synced ${relTime(ingestKey.last_used_at)}.` : "Not used yet."} Setting up a new phone? Make a new key.
              </p>
            ) : (
              <p className="text-xs text-faint">We copy it for you. It&apos;s only shown once.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant={hasKey ? "secondary" : "primary"} loading={making} onClick={() => make()}>
                <KeyRound className="h-4 w-4" /> {hasKey ? "New key" : "Get & copy key"}
              </Button>
              {hasKey ? (
                <Button size="sm" variant="ghost" loading={revoking} onClick={() => revoke()}>
                  Revoke
                </Button>
              ) : null}
            </div>
          </Step>
          <Step n={2} title="Add the Shortcut to your iPhone">
            <p className="text-xs text-faint">Opens Shortcuts. Tap <b>Add Shortcut</b> and paste your key when asked.</p>
            <a href={shortcutUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#141218] transition hover:brightness-95">
              <Smartphone className="h-4 w-4" /> Add to iPhone
            </a>
          </Step>
          <Step n={3} title="Run it once">
            <p className="text-xs text-faint">iPhone asks to let it read Dietary Energy and talk to this site. Tap <b>Allow</b> for both.</p>
            <a href={`shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3.5 text-[13px] font-semibold text-ink transition hover:bg-white/[0.12]">
              <RefreshCw className="h-4 w-4" /> Sync now
            </a>
          </Step>
          <Step n={4} title="Make it automatic">
            <p className="text-xs text-faint">
              Shortcuts &rarr; <b>Automation</b> &rarr; <b>+</b> &rarr; <b>Time of Day</b>, 10 pm, Daily &rarr; <b>Run Immediately</b> &rarr; pick “{SHORTCUT_NAME}”. Apple only lets you set this up yourself.
            </p>
          </Step>
        </ol>
      ) : (
        <>
          {token ? <KeyBox token={token} onCopy={() => copy(token)} /> : ingestKey ? (
            <p className="mt-2 text-xs text-faint">Sync key active since {relTime(ingestKey.created_at)}. {ingestKey.last_used_at ? `Last used ${relTime(ingestKey.last_used_at)}.` : "Not used yet."}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={making} onClick={() => make()}>
              <KeyRound className="h-4 w-4" /> {hasKey ? "Make a new key" : "Make a sync key"}
            </Button>
            {hasKey ? (
              <Button size="sm" variant="ghost" loading={revoking} onClick={() => revoke()}>
                Revoke key
              </Button>
            ) : null}
          </div>
        </>
      )}

      <details className="mt-4 rounded-xl border border-line/70 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">{shortcutUrl ? "Build the Shortcut yourself instead" : "How to set up the Shortcut"}</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>Open <b>Shortcuts</b> on your iPhone, tap <b>+</b> to make a new shortcut, name it “{SHORTCUT_NAME}”.</li>
          <li>
            Add <b>Find Health Samples</b>: Type <b>Dietary Energy</b>, Start Date <b>is today</b>. Then <b>Calculate Statistics</b>: <b>Sum</b>.
          </li>
          <li>
            Add <b>Get Contents of URL</b> with URL{" "}
            <code className="break-all rounded bg-white/10 px-1 font-mono text-xs">{ingestUrl}</code>
            <button type="button" className="ml-1 text-lavender underline" onClick={() => copy(ingestUrl)}>
              copy
            </button>
            . Method <b>POST</b>, Headers: <code className="font-mono text-xs">Authorization</code> = <code className="font-mono text-xs">Bearer &lt;your key&gt;</code>. Request Body <b>JSON</b> with <code className="font-mono text-xs">calories</code> (Number) = the Statistics result, and <code className="font-mono text-xs">date</code> (Text) = <b>Current Date</b> formatted as <b>ISO 8601</b>, date only.
          </li>
          <li>
            In the <b>Automation</b> tab, make a <b>Time of Day</b> automation (say 10 pm, daily, <b>Run Immediately</b>) that runs “{SHORTCUT_NAME}”. Running it again the same day just updates that day&apos;s total.
          </li>
          <li>
            Optional workouts: send <code className="font-mono text-xs">type</code> (e.g. “Running”), <code className="font-mono text-xs">duration_min</code>, <code className="font-mono text-xs">distance_km</code> and <code className="font-mono text-xs">start</code> (ISO 8601) in the same way. Skip this if you already use Strava, or workouts will count twice.
          </li>
        </ol>
      </details>
      <p className="mt-3 text-xs text-faint">
        HealthifyMe: in its settings, connect Apple Health and allow it to write nutrition. Then check Health &rarr; Browse &rarr; Nutrition &rarr; Dietary Energy shows HealthifyMe as a source.
      </p>
    </div>
  );
}

const SHORTCUT_NAME = "nudge sync";

function KeyBox({ token, onCopy }: { token: string; onCopy: () => void }) {
  return (
    <div className="mt-1 rounded-xl border border-line bg-white/[0.04] p-3">
      <div className="label-mono mb-1 text-[10px]">your sync key (shown once)</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs">{token}</code>
        <Button size="icon" variant="ghost" aria-label="Copy key" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs ${done ? "bg-lavender text-[#141218]" : "border border-line text-muted"}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {children}
      </div>
    </li>
  );
}
