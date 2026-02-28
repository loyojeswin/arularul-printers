import { NextFunction, Request, Response } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = (err as any).statusCode || 500;
  return res.status(statusCode).json({
    message: err.message || "Internal Server Error"
  });
}
