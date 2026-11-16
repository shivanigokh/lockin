"use client";
import { useEffect, useRef, useState } from "react";
import { Apple, Copy, KeyRound, Link2, RefreshCw, Unplug } from "lucide-react";
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

export function ConnectedApps({ strava, stravaReady, ingestKey, ingestUrl, status }: { strava: Strava; stravaReady: boolean; ingestKey: Key; ingestUrl: string; status?: string }) {
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
        <AppleHealthPanel ingestKey={ingestKey} ingestUrl={ingestUrl} />
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

function AppleHealthPanel({ ingestKey, ingestUrl }: { ingestKey: Key; ingestUrl: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [make, making] = useAction(createIngestToken, { onSuccess: (d) => setToken(d?.token ?? null) });
  const [revoke, revoking] = useAction(revokeIngestToken, { onSuccess: () => setToken(null) });
  const toast = useToast();
  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast("Copied."));
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#141218]">
          <Apple className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">Apple Health (via Shortcuts)</h3>
      </div>
      <p className="text-sm text-muted">
        Apple Health has no web connection, so an iPhone Shortcut sends your data here. Use it for <b>daily calories</b> (including from food apps like HealthifyMe that write to Apple Health) and, if you don&apos;t use Strava, workouts. Calories land in your private vault only.
      </p>

      {token ? (
        <div className="mt-3 rounded-xl border border-line bg-white/[0.04] p-3">
          <div className="label-mono mb-1 text-[10px]">your sync key (shown once)</div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{token}</code>
            <Button size="icon" variant="ghost" aria-label="Copy key" onClick={() => copy(token)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : ingestKey ? (
        <p className="mt-2 text-xs text-faint">Sync key active since {relTime(ingestKey.created_at)}. {ingestKey.last_used_at ? `Last used ${relTime(ingestKey.last_used_at)}.` : "Not used yet."}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={making} onClick={() => make()}>
          <KeyRound className="h-4 w-4" /> {ingestKey || token ? "Make a new key" : "Make a sync key"}
        </Button>
        {ingestKey || token ? (
          <Button size="sm" variant="ghost" loading={revoking} onClick={() => revoke()}>
            Revoke key
          </Button>
        ) : null}
      </div>

      <details className="mt-4 rounded-xl border border-line/70 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">How to set up the Shortcut</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>Open <b>Shortcuts</b> on your iPhone, tap <b>+</b> to make a new shortcut, name it “nudge sync”.</li>
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
            In the <b>Automation</b> tab, make a <b>Time of Day</b> automation (say 10 pm, daily, <b>Run Immediately</b>) that runs “nudge sync”. Running it again the same day just updates that day&apos;s total.
          </li>
          <li>
            Optional workouts: send <code className="font-mono text-xs">type</code> (e.g. “Running”), <code className="font-mono text-xs">duration_min</code>, <code className="font-mono text-xs">distance_km</code> and <code className="font-mono text-xs">start</code> (ISO 8601) in the same way. Skip this if you already use Strava, or workouts will count twice.
          </li>
        </ol>
        <p className="mt-3 text-xs text-faint">
          HealthifyMe: in its settings, connect Apple Health and allow it to write nutrition. Then check Health &rarr; Browse &rarr; Nutrition &rarr; Dietary Energy shows HealthifyMe as a source.
        </p>
      </details>
    </div>
  );
}
