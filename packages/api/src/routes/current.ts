import { FastifyInstance } from "fastify";
import { getDB } from "../db.js";
import type { CurrentState } from "../types.js";

export default async function currentRoutes(fastify: FastifyInstance) {
  fastify.get("/api/current", async (_request, reply) => {
    try {
      const db = getDB();
      const state = await db
        .collection<CurrentState>("current_state")
        .findOne({ _type: "latest" });

      if (!state) {
        return { live: false, params: null, entries: [] };
      }

      const params = state.params ?? {};
      const entries = state.entries ?? [];
      const elapsed_s = (params.elapsedTime as number) ?? 0;
      const h = Math.floor(elapsed_s / 3600);
      const m = Math.floor((elapsed_s % 3600) / 60);
      const s = Math.floor(elapsed_s % 60);

      return {
        live: true,
        updated_at: state.updated_at,
        poll: state.poll,
        session: {
          event_name: (params.sessionName as string) ?? "WEC",
          session_id: (params.sessionId as number | null) ?? null,
          elapsed_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
          elapsed_seconds: elapsed_s,
          remaining_seconds: (params.remaining as number) ?? 0,
          flag_state: (params.raceState as string) ?? "green",
          safety_car:
            params.safetyCar !== "N/A" &&
            params.safetyCar !== "" &&
            params.safetyCar != null,
          start_time: (params.startTime as number | null) ?? null,
          duration: (params.duration as number | null) ?? null,
          weather: {
            condition: (params.weather as string) ?? "unknown",
            air_temp: (params.airTemp as number | null) ?? null,
            track_temp: (params.trackTemp as number | null) ?? null,
            humidity: (params.humidity as number | null) ?? null,
            pressure: (params.pressure as number | null) ?? null,
            wind_speed: (params.windSpeed as number | null) ?? null,
            wind_direction: (params.windDirection as number | null) ?? null,
          },
        },
        entries,
      };
    } catch (err) {
      console.error("[api] /api/current error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
