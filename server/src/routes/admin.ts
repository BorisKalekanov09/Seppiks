/**
 * routes/admin.ts
 *
 * Admin-only endpoints for exporting the vote dataset.
 * The dataset contains every vote enriched with question context and
 * anonymised user demographics — useful for training ML preference models.
 *
 * Access: requires a valid JWT whose matching profile has role = 'admin'.
 */

import { FastifyPluginAsync } from "fastify";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";

// Hard ceiling so a single request cannot dump millions of rows
const MAX_LIMIT = 10_000;

export const adminRoutes: FastifyPluginAsync = async (fastify) => {

  /**
   * Guard: verify the authenticated user is an admin.
   * Runs after requireAuth, so request.user is already populated.
   */
  async function requireAdmin(request: any, reply: any) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", request.user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      return reply.status(403).send({ error: "Forbidden: admin access required" });
    }
  }

  /**
   * GET /api/admin/dataset
   *
   * Export the vote dataset. Supports pagination, category filtering,
   * and optional CSV format for direct import into data science tooling.
   *
   * Query params:
   *   limit    {number}  Rows to return (default 1000, max 10000)
   *   offset   {number}  Row offset for pagination (default 0)
   *   category {string}  Filter by question category (optional)
   *   format   {string}  "json" (default) or "csv"
   */
  fastify.get("/dataset", {
    preHandler: [requireAuth, requireAdmin],
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" }
    }
  }, async (request, reply) => {
    const query = request.query as {
      limit?: string;
      offset?: string;
      category?: string;
      format?: string;
    };

    const limit  = Math.min(parseInt(query.limit  || "1000", 10), MAX_LIMIT);
    const offset = Math.max(parseInt(query.offset || "0",    10), 0);
    const format = query.format === "csv" ? "csv" : "json";

    // Build query against the ML view for clean labelled output
    let dbQuery = supabase
      .from("v_ml_dataset")
      .select("*", { count: "exact" })
      .order("voted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.category) {
      dbQuery = dbQuery.eq("category", query.category);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch dataset" });
    }

    if (format === "csv") {
      const csv = toCSV(data ?? []);
      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="seppiks_dataset_${Date.now()}.csv"`)
        .send(csv);
    }

    return {
      total:  count ?? 0,
      limit,
      offset,
      rows:   data ?? [],
    };
  });

  /**
   * GET /api/admin/dataset/stats
   *
   * Quick aggregate stats about the dataset — useful for monitoring data quality
   * before kicking off a training run.
   */
  fastify.get("/dataset/stats", {
    preHandler: [requireAuth, requireAdmin],
    config: {
      rateLimit: { max: 30, timeWindow: "1 minute" }
    }
  }, async (request, reply) => {
    const { data, error } = await supabase.rpc("get_vote_dataset_stats");

    if (error) {
      // Fallback: manual aggregate if the RPC isn't deployed yet
      const { data: rows, error: rowsError } = await supabase
        .from("vote_dataset")
        .select("category, vote, age_group, region");

      if (rowsError) {
        request.log.error(rowsError);
        return reply.status(500).send({ error: "Failed to fetch dataset stats" });
      }

      const total        = rows?.length ?? 0;
      const yes          = rows?.filter(r => r.vote === 1).length ?? 0;
      const no           = total - yes;
      const byCategory   = groupCount(rows ?? [], "category");
      const byAgeGroup   = groupCount(rows ?? [], "age_group");

      return { total, yes, no, by_category: byCategory, by_age_group: byAgeGroup };
    }

    return data;
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: any) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

function groupCount(rows: Record<string, any>[], field: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key    = row[field] ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
