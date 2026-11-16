import { describe, expect, it } from "vitest";
import { mapActivityType, normaliseIngest, parseKm, parseMinutes, stravaToWorkout } from "@/lib/ingest";

describe("ingest normalisation", () => {
  it("maps Strava and Apple activity names", () => {
    expect(mapActivityType("TrailRun")).toBe("running");
    expect(mapActivityType("Outdoor Walk")).toBe("walking");
    expect(mapActivityType("HKWorkoutActivityTypeTraditionalStrengthTraining")).toBe("strength");
    expect(mapActivityType("MountainBikeRide")).toBe("cycling");
    expect(mapActivityType("Pool Swim")).toBe("swimming");
    expect(mapActivityType("Pilates")).toBe("yoga");
    expect(mapActivityType("Badminton")).toBe("sports");
    expect(mapActivityType("Elliptical")).toBe("other");
  });

  it("parses durations and distances in the shapes Shortcuts produces", () => {
    expect(parseMinutes(32.4)).toBe(32);
    expect(parseMinutes("1 hr 5 min")).toBe(65);
    expect(parseMinutes("1:05:00")).toBe(65);
    expect(parseMinutes("45:30")).toBe(46);
    expect(parseMinutes("")).toBeNull();
    expect(parseKm("3.1 mi")).toBe(4.99);
    expect(parseKm("5200 m")).toBe(5.2);
    expect(parseKm(0)).toBeNull();
  });

  it("accepts a single calories post and a list of workouts", () => {
    const today = "2026-11-16";
    expect(normaliseIngest({ calories: "1,850 kcal", date: "2026-11-16" }, today).items).toEqual([{ kind: "calories", date: today, calories: 1850 }]);
    const { items, errors } = normaliseIngest(
      { workouts: [{ type: "Running", duration_min: 30, distance: "5 km", start: "2026-11-15T07:30:00+05:30" }, { type: "Yoga" }] },
      today,
    );
    expect(items).toEqual([
      { kind: "workout", activity_type: "running", date: "2026-11-15", duration_min: 30, distance_km: 5, external_id: "2026-11-15T07:30:00+05:30|running|30" },
    ]);
    expect(errors).toHaveLength(1);
    expect(normaliseIngest({ calories: 100, date: "2026-11-20" }, today).errors[0]).toMatch(/future/);
    expect(normaliseIngest({ calories: 100, date: "16 Nov 2026" }, today).errors[0]).toMatch(/ISO/);
  });

  it("accepts one workout per request the way the Shortcut loop sends it, and skips empty calorie days", () => {
    const today = "2026-11-16";
    const { items } = normaliseIngest({ key: "nk_x", type: "Outdoor Run", duration_min: "32", start: "2026-11-16T06:40:00+05:30" }, today);
    expect(items).toEqual([
      { kind: "workout", activity_type: "running", date: today, duration_min: 32, distance_km: null, external_id: "2026-11-16T06:40:00+05:30|running|32" },
    ]);
    expect(normaliseIngest({ calories: 0, date: today }, today)).toEqual({ items: [], errors: [] });
  });

  it("turns a Strava activity into a workout row", () => {
    expect(
      stravaToWorkout({ id: 123, name: "Morning Run", sport_type: "Run", start_date_local: "2026-11-16T06:10:00Z", moving_time: 1800, distance: 5012.3 }),
    ).toEqual({ activity_type: "running", performed_on: "2026-11-16", duration_min: 30, distance_km: 5.01, note: "Morning Run", source: "strava", external_id: "123" });
  });
});
