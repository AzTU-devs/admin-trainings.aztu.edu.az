import type { UUID } from "@shared/types/lms";

/** Mirror of backend CategoryDto. */
export interface CategoryDto {
  id: UUID;
  parentId?: UUID;
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
  sortOrder: number;
  active: boolean;
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
