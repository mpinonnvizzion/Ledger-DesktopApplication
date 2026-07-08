import { invoke } from "@tauri-apps/api/core";
import type { Category, CategoryType } from "@/types/domain";

export async function createCategory(
  workspaceId: number,
  name: string,
  categoryType: CategoryType,
  parentId?: number,
): Promise<Category> {
  return invoke("create_category", {
    workspaceId,
    name,
    categoryType,
    parentId,
  });
}

export async function getCategory(id: number): Promise<Category> {
  return invoke("get_category", { id });
}

export async function listCategoriesByWorkspace(
  workspaceId: number,
): Promise<Category[]> {
  return invoke("list_categories_by_workspace", { workspaceId });
}

export async function updateCategory(
  id: number,
  name?: string,
  parentId?: number,
): Promise<Category> {
  return invoke("update_category", { id, name, parentId });
}

export async function deleteCategory(id: number): Promise<void> {
  return invoke("delete_category", { id });
}

export async function seedDefaultCategories(
  workspaceId: number,
): Promise<void> {
  return invoke("seed_default_categories", { workspaceId });
}
