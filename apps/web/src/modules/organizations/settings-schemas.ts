import { z } from "zod";

export const deleteOrganizationSchema = z.object({
  confirmationName: z.string().min(1, "Enter the organization name."),
});

export interface DeleteOrganizationState {
  message?: string;
  status: "idle" | "error";
}

export const initialDeleteOrganizationState: DeleteOrganizationState = {
  status: "idle",
};
