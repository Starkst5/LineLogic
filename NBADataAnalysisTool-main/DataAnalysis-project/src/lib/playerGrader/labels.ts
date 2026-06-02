export function getProbabilityColor(probability: number): string {
  if (probability >= 70) return "#16a34a";
  if (probability >= 55) return "#ca8a04";
  return "#dc2626";
}

export function getProbabilityLabel(probability: number): string {
  if (probability >= 75) return "Strong Likely";
  if (probability >= 60) return "Likely";
  if (probability >= 45) return "Toss Up";
  if (probability >= 30) return "Unlikely";
  return "Strong Unlikely";
}

export function getVerdictFromGrade(
  grade: number
):
  | "ALMOST GUARANTEED"
  | "LIKELY"
  | "LEAN LIKELY"
  | "TOSS UP"
  | "LEAN UNLIKELY"
  | "UNLIKELY"
  | "HIGHLY UNLIKELY" {
  if (grade >= 80) return "ALMOST GUARANTEED";
  if (grade >= 65) return "LIKELY";
  if (grade >= 55) return "LEAN LIKELY";
  if (grade >= 45) return "TOSS UP";
  if (grade >= 35) return "LEAN UNLIKELY";
  if (grade >= 20) return "UNLIKELY";
  return "HIGHLY UNLIKELY";
}