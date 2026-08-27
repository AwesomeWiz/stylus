export type WorkerActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  pairingToken?: string;
};

export const initialWorkerActionState: WorkerActionState = { status: "idle" };
