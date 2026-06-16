import { NotFoundError } from "../errors/index.js";
import type { ActionItemRepository } from "../repositories/ActionItemRepository.js";
import type {
  ActionItemFilters,
  UpdateActionItemInput,
} from "../validation/actionItem.schema.js";

export class ActionItemService {
  constructor(private readonly repo: ActionItemRepository) {}

  search(filters: ActionItemFilters) {
    return this.repo.search(filters);
  }

  update(id: string, patch: UpdateActionItemInput) {
    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundError("Action item not found");
    return updated;
  }
}
