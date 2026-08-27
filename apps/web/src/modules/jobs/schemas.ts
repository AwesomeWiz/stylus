import { z } from "zod";

export const jobIdSchema = z.uuid();

export type JobActionState = {
  jobId?: string;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialJobActionState: JobActionState = { status: "idle" };
