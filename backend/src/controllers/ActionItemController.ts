import type { Request, Response } from "express";
import { parseOrThrow } from "../middleware/validate.js";
import type { ActionItemService } from "../services/ActionItemService.js";
import {
  ActionItemFiltersSchema,
  UpdateActionItemInputSchema,
} from "../validation/actionItem.schema.js";

export class ActionItemController {
  constructor(private readonly service: ActionItemService) {}

  list = (req: Request, res: Response): void => {
    const filters = parseOrThrow(ActionItemFiltersSchema, req.query);
    res.json({ action_items: this.service.search(filters) });
  };

  update = (req: Request, res: Response): void => {
    const patch = parseOrThrow(UpdateActionItemInputSchema, req.body);
    res.json(this.service.update(req.params.id, patch));
  };
}
