import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Priority tiers are strict and ordered by impact (see CLAUDE.md):
// Critical > High > Medium > Low.
export const priorityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export default defineSchema({
  tasks: defineTable({
    name: v.string(),
    category: v.string(),
    priority: priorityValidator,
    // Optional scheduling/detail fields. Stored as ISO date strings
    // (YYYY-MM-DD) to match the timeline's date handling in app.js.
    start: v.optional(v.string()),
    due: v.optional(v.string()),
    notes: v.optional(v.string()),
  }),
});
