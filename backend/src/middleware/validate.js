import { z } from "zod";
import { badRequest } from "../utils/http-error.js";

export const validate =
  (schema, source = "query") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return next(
        badRequest("Invalid request", z.flattenError(result.error).fieldErrors),
      );
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
