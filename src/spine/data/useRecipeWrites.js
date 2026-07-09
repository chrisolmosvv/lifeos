import { useState } from "react";
import { createRecipe, updateRecipe, deleteRecipe } from "./recipeWrite";

// useRecipeWrites — recipe create/edit/delete + a failure toast. A recipe is a MULTI-TABLE write
// (recipe + N ingredients + M steps), so save is AWAIT-then-apply rather than optimistic: on
// failure createRecipe rolls back its orphan and we toast, so there's never a half-written recipe
// (and nothing optimistic to leave stranded). Delete is await + toast on failure.
export function useRecipeWrites() {
  const [toast, setToast] = useState(null); // { text } | null
  const [busy, setBusy] = useState(false);
  const dismiss = () => setToast(null);

  // Create (recipeId null) or update. Returns { ok, id } — the caller reloads the list on ok.
  async function save(recipeId, recipe, ingredients, steps) {
    setBusy(true);
    try {
      const id = recipeId ? (await updateRecipe(recipeId, recipe, ingredients, steps), recipeId) : await createRecipe(recipe, ingredients, steps);
      return { ok: true, id };
    } catch {
      setToast({ text: "Couldn’t save — try again." });
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteRecipe(id);
      return { ok: true };
    } catch {
      setToast({ text: "Couldn’t delete — try again." });
      return { ok: false };
    }
  }

  return { toast, dismiss, busy, save, remove };
}
