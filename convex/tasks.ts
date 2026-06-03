import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { priorityValidator } from "./schema";

// Fetch every task. The timeline renders the full set client-side and
// sorts/filters in memory, so we intentionally return all rows here.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

// Create a new task and return its generated id.
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    priority: priorityValidator,
    start: v.optional(v.string()),
    due: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", args);
  },
});

// Update an existing task. Only the provided fields are changed.
export const update = mutation({
  args: {
    id: v.id("tasks"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    start: v.optional(v.string()),
    due: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return null;
  },
});

// Delete a task by id.
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
