import type { UUID } from "@shared/types/lms";

/** Mirror of backend CategoryDto. */
export interface CategoryDto {
  id: UUID;
  parentId?: UUID | null;
  slug: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  sortOrder: number;
  active: boolean;
}

/** A category placed in the tree: how deep it sits and its full "Parent › Child" name. */
export interface CategoryNode extends CategoryDto {
  depth: number;
  path: string;
}

/** Mirror of backend CategoryUpsertRequest. */
export interface CategoryUpsertRequest {
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
  parentId?: UUID;
  sortOrder: number;
  active: boolean;
}
