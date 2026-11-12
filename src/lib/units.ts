export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";

const LB = 2.2046226218;
const IN = 2.54;

export const kgTo = (kg: number, u: WeightUnit) => (u === "kg" ? kg : kg * LB);
export const toKg = (v: number, u: WeightUnit) => (u === "kg" ? v : v / LB);
export const cmTo = (cm: number, u: LengthUnit) => (u === "cm" ? cm : cm / IN);
export const toCm = (v: number, u: LengthUnit) => (u === "cm" ? v : v * IN);
export const round1 = (n: number) => Math.round(n * 10) / 10;
