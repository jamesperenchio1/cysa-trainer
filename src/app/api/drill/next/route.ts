import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getQuestionsByIds } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const count = Math.min(50, Number(req.nextUrl.searchParams.get("count") || 15));
  const domain = req.nextUrl.searchParams.get("domain"); // e.g. "SO" | "VM" | "IR" | "RC" | null for all

  const domainJoinDue = domain
    ? `JOIN questions q ON q.id = srs_state.question_id JOIN domains d ON d.id = q.domain_id AND d.code = ?`
    : "";
  const dueParams = domain ? [domain, count] : [count];

  // 1) Prefer questions that are actually due (due_at <= now), ordered soonest-due first.
  const due = db
    .prepare(
      `SELECT srs_state.question_id as question_id FROM srs_state ${domainJoinDue}
       WHERE due_at <= datetime('now') ORDER BY due_at ASC LIMIT ?`
    )
    .all(...dueParams) as { question_id: number }[];

  let ids = due.map((r) => r.question_id);

  // 2) If not enough due questions, top up with never-seen questions, weighted toward
  //    domains where accuracy so far is weakest (or unseen, treated as weakest).
  if (ids.length < count) {
    const remaining = count - ids.length;
    const excludeClause = ids.length ? `AND q.id NOT IN (${ids.map(() => "?").join(",")})` : "";
    const domainClause = domain ? `AND d.code = ?` : "";
    const topUpParams = [...ids, ...(domain ? [domain] : []), remaining];
    const topUp = db
      .prepare(
        `SELECT q.id as question_id,
                COALESCE(CAST(s.times_correct AS REAL) / NULLIF(s.times_seen, 0), 0) as accuracy,
                COALESCE(s.times_seen, 0) as times_seen
         FROM questions q
         JOIN srs_state s ON s.question_id = q.id
         JOIN domains d ON d.id = q.domain_id
         WHERE 1=1 ${excludeClause} ${domainClause}
         ORDER BY times_seen ASC, accuracy ASC
         LIMIT ?`
      )
      .all(...topUpParams) as { question_id: number }[];
    ids = ids.concat(topUp.map((r) => r.question_id));
  }

  // Shuffle so weak/due questions aren't always presented in the same order.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const questions = getQuestionsByIds(ids);
  return NextResponse.json({ questions });
}
