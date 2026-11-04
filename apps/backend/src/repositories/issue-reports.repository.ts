import { database } from "../infrastructure/database.js";

export async function createIssueReport(input: {
  reporterUserId: string | null;
  reporter: Record<string, string>;
  appName: string;
  errorName: string;
  details: string;
  description: string;
  source: string;
  requestId: string | null;
}): Promise<string> {
  const result = await database.query(
    `INSERT INTO issue_reports (
       reporter_user_id, reporter, app_name, error_name, details,
       description, source, request_id, metadata
     ) VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, '{}'::jsonb)
     RETURNING id`,
    [input.reporterUserId, JSON.stringify(input.reporter), input.appName,
     input.errorName, input.details, input.description, input.source, input.requestId],
  );
  return String(result.rows[0].id);
}
