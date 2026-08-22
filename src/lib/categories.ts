import type { ExpenseCategory } from "../../shared/types";
import type { IconName } from "../components/Icon";

/**
 * What the money went on. Deliberately a short, closed list: a free-form tag
 * field would fragment into "jedzenie"/"Jedzenie"/"jedzonko" and stop being
 * groupable, which is the only reason to have categories at all.
 */
export const CATEGORIES: { id: ExpenseCategory; label: string; icon: IconName }[] = [
  { id: "food", label: "Jedzenie", icon: "food" },
  { id: "transport", label: "Transport", icon: "car" },
  { id: "stay", label: "Nocleg", icon: "bed" },
  { id: "fun", label: "Rozrywka", icon: "music" },
  { id: "shop", label: "Zakupy", icon: "cart" },
  { id: "other", label: "Inne", icon: "receipt" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Entries created before categories existed have none; they read as "Inne". */
export function categoryOf(id: ExpenseCategory | undefined) {
  return (id && BY_ID.get(id)) || BY_ID.get("other")!;
}
