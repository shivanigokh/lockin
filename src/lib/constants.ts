import {
  Bike, Dumbbell, Droplets, Flame, Footprints, GlassWater, Moon, Salad, Sparkles, Trophy, Waves,
  Activity, Zap, Skull, Rocket, Mountain, Heart, Coffee, Apple, Bed, Brain, Sun, Target, Check,
  PersonStanding, type LucideIcon,
} from "lucide-react";
import type { Database } from "@/lib/database.types";

export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type GoalCategory = Database["public"]["Enums"]["goal_category"];
export type GoalTracking = Database["public"]["Enums"]["goal_tracking"];
export type GoalPeriod = Database["public"]["Enums"]["goal_period"];
export type ChallengeMetric = Database["public"]["Enums"]["challenge_metric"];

export const ACTIVITIES: { value: ActivityType; label: string; verb: string; icon: LucideIcon; color: string }[] = [
  { value: "walking", label: "Walk", verb: "walk", icon: Footprints, color: "var(--color-lime)" },
  { value: "running", label: "Run", verb: "run", icon: Zap, color: "var(--color-pink)" },
  { value: "swimming", label: "Swim", verb: "swim", icon: Waves, color: "var(--color-cyan)" },
  { value: "strength", label: "Gym / strength", verb: "gym session", icon: Dumbbell, color: "var(--color-lavender)" },
  { value: "cycling", label: "Cycle", verb: "ride", icon: Bike, color: "var(--color-orange)" },
  { value: "yoga", label: "Yoga", verb: "yoga session", icon: PersonStanding, color: "#7ee0b5" },
  { value: "sports", label: "Sports", verb: "sports session", icon: Trophy, color: "#ffd84d" },
  { value: "other", label: "Other", verb: "workout", icon: Activity, color: "#a3a3ad" },
];
export const activity = (t: string | null | undefined) => ACTIVITIES.find((a) => a.value === t) ?? ACTIVITIES[7]!;

export const HABIT_ICONS: Record<string, LucideIcon> = {
  salad: Salad, "glass-water": GlassWater, footprints: Footprints, dumbbell: Dumbbell, droplets: Droplets,
  moon: Moon, check: Check, apple: Apple, bed: Bed, brain: Brain, sun: Sun, coffee: Coffee, heart: Heart,
  sparkles: Sparkles, target: Target,
};
export const habitIcon = (k: string | null | undefined) => HABIT_ICONS[k ?? "check"] ?? Check;

export const HABIT_KEYS: { value: string; label: string }[] = [
  { value: "balanced_meals", label: "Ate balanced meals" },
  { value: "alcohol_free", label: "Alcohol-free day" },
  { value: "walk", label: "Went for a walk" },
  { value: "exercise", label: "Exercised" },
  { value: "water", label: "Drank enough water" },
  { value: "sleep", label: "Slept sufficiently" },
];

export const SQUAD_ICONS: Record<string, LucideIcon> = {
  flame: Flame, waves: Waves, zap: Zap, skull: Skull, rocket: Rocket, mountain: Mountain,
  dumbbell: Dumbbell, footprints: Footprints, trophy: Trophy, sparkles: Sparkles, heart: Heart, brain: Brain,
};
export const squadIcon = (k: string | null | undefined) => SQUAD_ICONS[k ?? "flame"] ?? Flame;

export const SQUAD_COLORS = ["lime", "pink", "lavender", "orange", "cyan"] as const;
export type SquadColor = (typeof SQUAD_COLORS)[number];
export const colorVar = (c: string | null | undefined) => `var(--color-${c ?? "lime"})`;

export const GOAL_CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: "workouts", label: "Workouts" },
  { value: "running", label: "Running" },
  { value: "walking", label: "Walking" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "strength", label: "Strength" },
  { value: "steps", label: "Steps" },
  { value: "alcohol_free", label: "Less alcohol" },
  { value: "nutrition", label: "Nutrition" },
  { value: "cooking", label: "Cooking at home" },
  { value: "sleep", label: "Sleep" },
  { value: "hydration", label: "Hydration" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "weight", label: "Weight (never shareable)" },
  { value: "other", label: "Other" },
];

export const TRACKING: { value: GoalTracking; label: string; hint: string }[] = [
  { value: "workout_count", label: "Count my workouts", hint: "Auto-counts logged sessions" },
  { value: "distance_km", label: "Add up distance (km)", hint: "Auto-sums logged distance" },
  { value: "active_minutes", label: "Add up active minutes", hint: "Auto-sums workout minutes" },
  { value: "habit_days", label: "Count habit days", hint: "Days you ticked a daily habit" },
  { value: "manual", label: "I'll log it myself", hint: "Steps, meals cooked, anything" },
];

export const CHALLENGE_METRICS: { value: ChallengeMetric; label: string }[] = [
  { value: "workout_count", label: "Workouts logged" },
  { value: "active_minutes", label: "Active minutes" },
  { value: "distance_km", label: "Distance (km)" },
  { value: "habit_days", label: "Habit days" },
  { value: "manual", label: "Self-reported (e.g. steps)" },
];

export const REACTIONS: { key: string; glyph: string; label: string }[] = [
  { key: "fire", glyph: "🔥", label: "fire" },
  { key: "flex", glyph: "💪", label: "flex" },
  { key: "clap", glyph: "👏", label: "clap" },
  { key: "skull", glyph: "💀", label: "dead" },
  { key: "heart", glyph: "❤️", label: "love" },
  { key: "eyes", glyph: "👀", label: "watching" },
];

export const AWARDS: Record<string, { label: string; blurb: string; icon: LucideIcon; color: string }> = {
  first_place: { label: "First place", blurb: "Top of the pile this week", icon: Trophy, color: "var(--color-lime)" },
  most_consistent: { label: "Most consistent", blurb: "Shows up. Every. Day.", icon: Target, color: "var(--color-lavender)" },
  biggest_comeback: { label: "Biggest comeback", blurb: "Rose from the couch", icon: Rocket, color: "var(--color-pink)" },
  weekend_warrior: { label: "Weekend warrior", blurb: "Saturday is leg day", icon: Sun, color: "var(--color-orange)" },
  most_active: { label: "Most active", blurb: "Most minutes this week", icon: Flame, color: "var(--color-cyan)" },
};

export const COPY = {
  tagline: "LESS TALK. MORE ACTION.",
  leaderboard: "Your body is not a leaderboard.",
  couch: "Be less of a couch creature.",
  hydrated: "Hydrated? Emotionally? Physically? Unclear.",
};

export const MAX_MEMBERS = 10;
export const MIN_MEMBERS = 3;
