import { z } from "zod";

export const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80)
  })
});
