import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { fromDate } from "../../db/transform.js";
import { isoDate } from "./days.js";

const searchResultSchema = z.object({
  entryId: z.number(),
  dates: z.array(isoDate),
  rank: z.number(),
  snippet: z.string(),
});

const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
});

interface SearchRow {
  entryId: number;
  dates: Date[];
  rank: number;
  snippet: string;
}

/**
 * Lexical (not semantic) search over `entries.searchVector`, a tsvector
 * generated from `text` -- see the migration. Ranks by ts_rank and carves a
 * snippet around the match with ts_headline; the GROUP BY e.id is valid
 * without listing every selected column because id is the primary key, so
 * Postgres knows the rest of the row is functionally dependent on it.
 */
export const searchRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/search",
    {
      // Stricter than the global default (server.ts) -- ts_rank/ts_headline
      // is real per-request DB work, unlike the indexed lookups on /days.
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        summary: "Full-text search over entry text",
        tags: ["search"],
        querystring: z.object({
          q: z.string().trim().min(1, "q must not be empty"),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
        response: { 200: searchResponseSchema },
      },
    },
    async (request) => {
      const { q, limit } = request.query;
      const rows = await prisma.$queryRaw<SearchRow[]>`
        SELECT e.id AS "entryId",
               array_agg(d.date ORDER BY d.date) AS dates,
               ts_rank(e."searchVector", plainto_tsquery('english', ${q})) AS rank,
               ts_headline(
                 'english', e.text, plainto_tsquery('english', ${q}),
                 'MaxFragments=1, MaxWords=35, MinWords=15'
               ) AS snippet
        FROM entries e
        JOIN days d ON d."entryId" = e.id
        WHERE e."searchVector" @@ plainto_tsquery('english', ${q})
        GROUP BY e.id
        ORDER BY rank DESC
        LIMIT ${limit}
      `;
      return {
        query: q,
        results: rows.map((row) => ({
          entryId: row.entryId,
          dates: row.dates.map(fromDate),
          rank: row.rank,
          snippet: row.snippet,
        })),
      };
    },
  );
};
