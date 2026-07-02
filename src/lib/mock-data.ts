/**
 * Rolling 4-week training volume per muscle group, 0-100, for the Gym > Body
 * heatmap (Section 6B.3 of the plan). This is still static/placeholder data —
 * deriving it from real logged sets needs an exercise -> muscle-group mapping
 * table (exercise_muscle_map in the plan) that hasn't been built yet. Everything
 * else in the app now comes from Supabase; this is the one deliberate exception.
 */
export const MUSCLE_VOLUME: Record<string, number> = {
  chest: 78,
  shoulders: 62,
  biceps: 45,
  triceps: 58,
  abs: 35,
  quads: 70,
  hamstrings: 40,
  calves: 20,
  back: 66,
  glutes: 52,
  forearms: 25,
};
