import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";
import { Target } from "@/types/target";

type TargetStatus = Target["status"];

export const TARGET_STATUS_META: Record<
  TargetStatus,
  { label: string; backgroundColor: string; textColor: string }
> = {
  active: {
    label: "Active",
    backgroundColor: PicoThemeVariables.secondaryBackground,
    textColor: "#fff",
  },
  completed: {
    label: "Completed",
    backgroundColor: PicoThemeVariables.primaryColor,
    textColor: "#fff",
  },
  cancelled: {
    label: "Cancelled",
    backgroundColor: PicoColors["red-500"],
    textColor: "#fff",
  },
};

export function getTargetStatusMeta(status: TargetStatus) {
  return TARGET_STATUS_META[status];
}

export function isTargetOverdue(target: Pick<Target, "status" | "deadlineAt">) {
  if (target.status !== "active" || !target.deadlineAt) {
    return false;
  }
  return new Date(target.deadlineAt).getTime() < Date.now();
}
