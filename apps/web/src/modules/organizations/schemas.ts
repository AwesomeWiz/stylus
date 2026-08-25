import { z } from "zod";

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters.")
  .max(80, "Organization name must be 80 characters or fewer.");

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
});

export interface OrganizationActionState {
  fieldErrors?: Partial<Record<"name", string[]>>;
  message?: string;
  status: "idle" | "error";
}

export const initialOrganizationActionState: OrganizationActionState = {
  status: "idle",
};
