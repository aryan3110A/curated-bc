import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export const validateRequest = (schema: ZodTypeAny): RequestHandler => {
  return (req, _res, next) => {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    next();
  };
};
