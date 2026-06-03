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

// Categories are a fixed taxonomy. Defined once here and reused by the task
// mutations so invalid values are rejected at write time (data integrity).
// These literals mirror the category options in index.html 1:1.
export const categoryValidator = v.union(
  v.literal("people"),
  v.literal("admin"),
  v.literal("process"),
  v.literal("adhoc"),
  v.literal("planning"),
  v.literal("ops"),
  v.literal("workflow"),
  v.literal("restructure"),
);

export default defineSchema({
  tasks: defineTable({
    name: v.string(),
    category: categoryValidator,
    priority: priorityValidator,
    // Optional scheduling/detail fields. Stored as ISO date strings
    // (YYYY-MM-DD) to match the timeline's date handling in app.js.
    start: v.optional(v.string()),
    due: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_priority", ["priority"])
    .index("by_category", ["category"]),
});
