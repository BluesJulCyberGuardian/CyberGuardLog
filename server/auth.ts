import bcryptjs from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function findUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

export async function createUser(
  username: string,
  email: string,
  password: string
) {
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
    })
    .returning();
  return user;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
