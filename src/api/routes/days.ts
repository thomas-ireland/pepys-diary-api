import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { fromDate, toDate } from "../../db/transform.js";
import { isValidYmd, parseIsoDate } from "../../ingest/calendar.js";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((value) => isValidYmd(...parseIsoDate(value)), {
    message: "not a valid calendar date",
  });

const daySchema = z.object({
  date: isoDate,
  label: z.string().nullable(),
  entry: z
    .object({
      id: z.number(),
      text: z.string(),
      commentary: z.array(
        z.object({
          anchor: z.string(),
          note: z.string(),
          source: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
});

const errorSchema = z.object({
  status: z.literal("error"),
  detail: z.string(),
});

const dayWithEntry = {
  include: {
    entry: { include: { commentary: { orderBy: { position: "asc" } } } },
  },
} satisfies Prisma.DayDefaultArgs;
type DayWithEntry = Prisma.DayGetPayload<typeof dayWithEntry>;

function serializeDay(day: DayWithEntry): z.infer<typeof daySchema> {
  return {
    date: fromDate(day.date),
    label: day.label,
    entry: day.entry
      ? {
          id: day.entry.id,
          text: day.entry.text,
          commentary: day.entry.commentary.map((note) => ({
            anchor: note.anchor,
            note: note.note,
            source: note.source,
          })),
        }
      : null,
  };
}

/**
 * Every calendar day in range has a row, including the ones Pepys wrote
 * nothing -- so a date within 1660-01-01..1669-05-31 always 200s, with
 * `entry: null` on the days he skipped. Outside that range there's no row
 * at all, which is the only way to get a 404 here.
 */
export const daysRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/days/:date",
    {
      schema: {
        summary: "A single calendar day",
        tags: ["days"],
        params: z.object({ date: isoDate }),
        response: { 200: daySchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const day = await prisma.day.findUnique({
        where: { date: toDate(request.params.date) },
        ...dayWithEntry,
      });
      if (!day) {
        reply.code(404);
        return {
          status: "error" as const,
          detail: `no such day: ${request.params.date}`,
        };
      }
      return serializeDay(day);
    },
  );

  app.get(
    "/days",
    {
      schema: {
        summary: "Calendar days in a date range, inclusive",
        tags: ["days"],
        querystring: z
          .object({ from: isoDate, to: isoDate })
          .refine((range) => range.from <= range.to, {
            message: "from must not be after to",
            path: ["from"],
          }),
        response: { 200: z.array(daySchema) },
      },
    },
    async (request) => {
      const { from, to } = request.query;
      const days = await prisma.day.findMany({
        where: { date: { gte: toDate(from), lte: toDate(to) } },
        orderBy: { date: "asc" },
        ...dayWithEntry,
      });
      return days.map(serializeDay);
    },
  );
};
