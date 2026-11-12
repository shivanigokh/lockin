"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Camera, Eye, EyeOff, Plus, Archive, ArchiveRestore, LogOut, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SquadBadge } from "@/components/shell/squad-switcher";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/lib/use-action";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount, setAvatar, updateProfile, updateSettings } from "@/app/actions/profile";
import { archiveHabit, moveHabit, saveHabit } from "@/app/actions/tracking";
import { leaveSquad } from "@/app/actions/squads";
import { HABIT_ICONS, habitIcon } from "@/lib/constants";
import { cn, displayName } from "@/lib/utils";
import type { MyGroup } from "@/lib/data";

type Profile = { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [save, saving] = useAction(updateProfile);
  const [setAv, settingAv] = useAction(setAvatar);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) return toast("Max 2 MB. It's an avatar, not a billboard.", "error");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast("PNG, JPG, WebP or GIF only.", "error");
    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1]!.replace("jpeg", "jpg");
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast(error.message, "error");
    }
    // tidy up older avatars
    const { data: old } = await supabase.storage.from("avatars").list(profile.id);
    const stale = (old ?? []).map((f) => `${profile.id}/${f.name}`).filter((p) => p !== path);
    if (stale.length) await supabase.storage.from("avatars").remove(stale);
    setUploading(false);
    await setAv(path);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(new FormData(e.currentTarget));
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar name={displayName(profile)} src={profile.avatar_url} seed={profile.id} size={72} />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button type="button" variant="secondary" size="sm" loading={uploading || settingAv} onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Upload photo
          </Button>
          {profile.avatar_url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setAv(null)}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" htmlFor="p-user" hint="Lowercase letters, numbers, underscores.">
          <Input id="p-user" name="username" required pattern="[a-zA-Z0-9_]{3,20}" defaultValue={profile.username} />
        </Field>
        <Field label="Display name" htmlFor="p-name">
          <Input id="p-name" name="display_name" maxLength={40} defaultValue={profile.display_name ?? ""} placeholder="Riva" />
        </Field>
      </div>
      <Field label="Bio" htmlFor="p-bio" hint="Visible to your squads.">
        <Textarea id="p-bio" name="bio" maxLength={160} rows={2} defaultValue={profile.bio ?? ""} placeholder="Professional couch creature, recovering." />
      </Field>
      <Button type="submit" loading={saving}>
        Save profile
      </Button>
    </form>
  );
}

type Settings = {
  timezone: string;
  weight_unit: string;
  length_unit: string;
  share_habits: boolean;
  default_workout_visibility: "groups" | "private";
  notify_reactions: boolean;
  notify_challenges: boolean;
  notify_invites: boolean;
  notify_squad_joins: boolean;
};

export function PrivacyForm({ settings }: { settings: Settings }) {
  const [s, setS] = useState(settings);
  const [save] = useAction(updateSettings, { refresh: true });
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [settings.timezone];
  const patch = (p: Partial<Settings>) => {
    setS((x) => ({ ...x, ...p }));
    save(p as Parameters<typeof updateSettings>[0]);
  };
  return (
    <div className="space-y-2">
      <div className="divide-y divide-line">
        <Toggle
          checked={s.share_habits}
          onChange={(v) => patch({ share_habits: v })}
          label="Share habit check-ins with my squads"
          description="Squads see which habits you ticked today. Turn off to hide all of them. You can also hide individual habits below."
        />
        <Toggle
          checked={s.default_workout_visibility === "groups"}
          onChange={(v) => patch({ default_workout_visibility: v ? "groups" : "private" })}
          label="New workouts are visible to squads by default"
          description="You can still flip each workout to private when logging."
        />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
        <Field label="Weight unit" htmlFor="s-wu">
          <Select id="s-wu" value={s.weight_unit} onChange={(e) => patch({ weight_unit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </Select>
        </Field>
        <Field label="Length unit" htmlFor="s-lu">
          <Select id="s-lu" value={s.length_unit} onChange={(e) => patch({ length_unit: e.target.value })}>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </Select>
        </Field>
        <Field label="Timezone" htmlFor="s-tz" className="col-span-2 sm:col-span-1" hint="Decides when your day resets.">
          <Select id="s-tz" value={s.timezone} onChange={(e) => patch({ timezone: e.target.value })}>
            {!zones.includes(s.timezone) ? <option value={s.timezone}>{s.timezone}</option> : null}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="pt-2 text-xs text-faint">
        Always private, no matter what: height, weight, measurements, health notes, private goals and private workouts.
      </p>
    </div>
  );
}

export function NotificationPrefs({ settings }: { settings: Settings }) {
  const [s, setS] = useState(settings);
  const [save] = useAction(updateSettings);
  const toggle = (k: keyof Settings) => (v: boolean) => {
    setS((x) => ({ ...x, [k]: v }));
    save({ [k]: v });
  };
  return (
    <div className="divide-y divide-line">
      <Toggle checked={s.notify_reactions} onChange={toggle("notify_reactions")} label="Reactions" description="When someone reacts to your posts or workouts." />
      <Toggle checked={s.notify_challenges} onChange={toggle("notify_challenges")} label="New challenges" description="When a squad starts a challenge." />
      <Toggle checked={s.notify_invites} onChange={toggle("notify_invites")} label="Squad invites" description="When someone invites you by username." />
      <Toggle checked={s.notify_squad_joins} onChange={toggle("notify_squad_joins")} label="New squad members" description="When someone joins one of your squads." />
    </div>
  );
}

type Habit = { id: string; name: string; icon: string; visible_to_groups: boolean; archived: boolean };

function HabitEditor({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const [name, setName] = useState(habit?.name ?? "");
  const [icon, setIcon] = useState(habit?.icon ?? "check");
  const [visible, setVisible] = useState(habit?.visible_to_groups ?? true);
  const [save, pending] = useAction(saveHabit, { onSuccess: onDone });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(habit?.id ?? null, { name, icon, visible_to_groups: visible });
      }}
    >
      <Field label="Habit" htmlFor="h-name">
        <Input id="h-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cooked at home" />
      </Field>
      <div>
        <div className="label-mono mb-2">Icon</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(HABIT_ICONS).map(([k, I]) => (
            <button key={k} type="button" aria-label={k} aria-pressed={icon === k} onClick={() => setIcon(k)} className={cn("flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer", icon === k ? "border-lime bg-lime/10 text-lime" : "border-line text-muted")}>
              <I className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <Toggle checked={visible} onChange={setVisible} label="Visible to my squads" description="Hidden habits still count for your own stats." />
      <Button type="submit" className="w-full" loading={pending}>
        {habit ? "Save habit" : "Add habit"}
      </Button>
    </form>
  );
}

export function HabitManager({ habits }: { habits: Habit[] }) {
  const [editing, setEditing] = useState<Habit | "new" | null>(null);
  const [move, moving] = useAction(moveHabit);
  const [archive, archiving] = useAction(archiveHabit);
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  return (
    <div>
      <ul className="space-y-2">
        {active.map((h, i) => {
          const I = habitIcon(h.icon);
          return (
            <li key={h.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2">
              <I className="h-4 w-4 text-lime" />
              <span className="flex-1 truncate text-sm font-semibold">{h.name}</span>
              {h.visible_to_groups ? <Eye className="h-3.5 w-3.5 text-muted" aria-label="Visible to squads" /> : <EyeOff className="h-3.5 w-3.5 text-faint" aria-label="Hidden from squads" />}
              <Button variant="ghost" size="icon" aria-label="Move up" disabled={i === 0 || moving} onClick={() => move(h.id, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Move down" disabled={i === active.length - 1 || moving} onClick={() => move(h.id, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Edit habit" onClick={() => setEditing(h)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Archive habit" disabled={archiving} onClick={() => archive(h.id, true)}>
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" className="mt-3" onClick={() => setEditing("new")}>
        <Plus className="h-4 w-4" /> Add habit
      </Button>
      {archived.length ? (
        <div className="mt-5">
          <div className="label-mono mb-2">archived</div>
          <ul className="space-y-1.5">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-muted">
                {h.name}
                <Button variant="ghost" size="sm" onClick={() => archive(h.id, false)}>
                  <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New habit" : "Edit habit"}>
        {editing !== null ? <HabitEditor habit={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}

export function MySquads({ groups }: { groups: MyGroup[] }) {
  const [leave, leaving] = useAction(leaveSquad);
  if (!groups.length) return <p className="text-sm text-muted">No squads yet. <Link href="/squads/new" className="text-lime hover:underline">Start one</Link>.</p>;
  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
          <SquadBadge g={g} size={32} />
          <div className="min-w-0 flex-1">
            <Link href={`/g/${g.id}/squad`} className="block truncate text-sm font-semibold hover:text-lime">
              {g.name}
            </Link>
            <span className="label-mono text-[10px]">
              {g.member_count}/10 · {g.role}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="hover:text-danger" disabled={leaving} onClick={() => confirm(`Leave ${g.name}?`) && leave(g.id)}>
            <LogOut className="h-3.5 w-3.5" /> Leave
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function DeleteAccount() {
  const [text, setText] = useState("");
  const [del, pending] = useAction(deleteAccount);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        del(text);
      }}
    >
      <p className="text-sm text-muted">
        Permanently deletes your account, health data, goals, workouts and posts. Squads you admin get a new admin automatically. This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE" className="max-w-48" aria-label="Type DELETE to confirm" />
        <Button type="submit" variant="danger" loading={pending} disabled={text !== "DELETE"}>
          Delete my account
        </Button>
      </div>
    </form>
  );
}
