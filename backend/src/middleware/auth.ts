import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser } from "../types";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const cookieHeader = req.headers.cookie || "";
  const cookieToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${env.COOKIE_NAME}=`))
    ?.split("=")[1];

  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.authUser = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}
