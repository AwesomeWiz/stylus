import { z } from "zod";

export const taskStatusValues = [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export const taskPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const nullableUuid = z
  .string()
  .trim()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Choose a valid organization member.",
  })
  .transform((value) => value || null);

const nullableTimestamp = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (z.iso.datetime({ offset: true }).safeParse(value).success &&
        Number.isFinite(Date.parse(value))),
    { message: "Choose a valid date and time." },
  )
  .transform((value) => value || null);

const taskFields = {
  assigneeId: nullableUuid,
  description: z
    .string()
    .trim()
    .max(5000, "Keep the description under 5,000 characters."),
  dueAt: nullableTimestamp,
  priority: z.enum(taskPriorityValues),
  scheduledAt: nullableTimestamp,
  title: z
    .string()
    .trim()
    .min(1, "Enter a task title.")
    .max(200, "Keep the title under 200 characters."),
};

function datesAreOrdered(input: {
  dueAt: string | null;
  scheduledAt: string | null;
}) {
  return (
    !input.dueAt ||
    !input.scheduledAt ||
    Date.parse(input.scheduledAt) <= Date.parse(input.dueAt)
  );
}

export const createTaskSchema = z.object(taskFields).refine(datesAreOrdered, {
  message: "The due time must be after the scheduled time.",
  path: ["dueAt"],
});

export const updateTaskSchema = z
  .object({
    ...taskFields,
    status: z.enum(taskStatusValues),
    taskId: z.uuid(),
  })
  .refine(datesAreOrdered, {
    message: "The due time must be after the scheduled time.",
    path: ["dueAt"],
  });

export const taskIdSchema = z.uuid();
export const taskCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment before posting.")
    .max(2000, "Keep comments under 2,000 characters."),
  taskId: taskIdSchema,
});

export type TaskActionState = {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialTaskActionState: TaskActionState = { status: "idle" };
