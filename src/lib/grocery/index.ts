/**
 * Grocery & Pantry Intelligence (System 5, foundation) — the pantry
 * model and the plan-derived grocery list. Pure logic; the Nutrition
 * tab's GrocerySection assembles the inputs and renders the result.
 */

export {
  MAX_PANTRY_ITEMS,
  MAX_PANTRY_QUANTITY_GRAMS,
  PANTRY_KEY,
  PANTRY_VERSION,
  addPantryItem,
  newPantryItemId,
  normalisePantryName,
  pantryValueOf,
  parsePantryValue,
  readPantry,
  removePantryItem,
  writePantry,
  type PantryItem,
  type PantryItemDraft,
  type PantryValue,
} from "./pantry";

export {
  GROCERY_CATEGORIES,
  buildGroceryList,
  formatGramAmount,
  groceryCategoryForGroup,
  type GroceryCategory,
  type GroceryGroup,
  type GroceryItem,
  type GroceryListInput,
  type GroceryListResult,
  type UnlistedEntry,
} from "./groceryList";
