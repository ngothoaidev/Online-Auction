// Moderation and admin commands. Every admin change runs in one transaction with its audit row, takes an
// optional Idempotency-Key (a repeated click/retry replays instead of acting twice) and re-checks the role server-side.
// Listing impacts go through the auction domain command (same lock/state rules as everywhere else). Moderation never
// edits reputation: ratings only ever come from reviews.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import db from "../db/index.ts";
import type { Tx, UserRow } from "../db/index.ts";
import { adminAudit, auctions, categories, listingReports, sellerRequests, userRoleEnum, users } from "../db/schema.ts";
import { AppError } from "../utils/errors.ts";
import { need } from "../domain/orderTransitions.ts";
import { runIdempotent } from "./idempotency.ts";
import { recordAdminAction } from "./adminAudit.ts";
import { commands as auctionCommands } from "./auctionCommands.ts";

export const REPORT_REASONS = ["counterfeit", "prohibited", "misleading", "offensive", "other"];
type Role = (typeof userRoleEnum.enumValues)[number];
const ROLES: readonly string[] = userRoleEnum.enumValues;
const isRole = (r: unknown): r is Role => typeof r === "string" && ROLES.includes(r);

const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} not found`);
const conflict = (code: string, message: string) => new AppError(409, code, message);

/** Wrap an admin command: role check, transaction, idempotency (operation includes the command name; payload the target). */
type AdminArgs<I> = I & { actor: UserRow | null | undefined; key?: string | null };

function adminCommand<I extends object, R extends object>(name: string, body: (tx: Tx, actor: UserRow, input: I) => Promise<R>) {
  return async ({ actor, key = null, ...input }: AdminArgs<I>) => {
    if (actor?.role !== "admin") throw new AppError(403, "FORBIDDEN", "Admin only");
    const out = await db.transaction((tx) => runIdempotent(tx, { actorId: actor.id, operation: `admin:${name}`, key, payload: input },
      async () => ({ status: 200, body: await body(tx, actor, input as unknown as I) })));
    return { ...out.body, replayed: out.replayed };
  };
}

const lockUser = async (tx: Tx, id: number) => {
  const [u] = await tx.select({ id: users.id, username: users.username, email: users.email, role: users.role, status: users.status }).from(users).where(eq(users.id, id)).for("update");
  if (!u) throw notFound("User");
  return u;
};
const userView = (u: { id: number; username: string; status: string | null; role: string | null }) => ({ id: u.id, username: u.username, status: u.status, role: u.role });

// --- users ---
export const banUser = adminCommand("ban_user", async (tx, actor, { userId, reason }: { userId: number; reason?: string | null }) => {
  reason = need(reason, "reason");
  const u = await lockUser(tx, userId);
  if (u.role === "admin") throw new AppError(400, "CANNOT_BAN_ADMIN", "Cannot ban an admin user");
  if (u.status === "banned") throw conflict("ALREADY_BANNED", "User is already banned");
  await tx.update(users).set({ status: "banned" }).where(eq(users.id, userId));
  await recordAdminAction(tx, { actor, action: "user.ban", targetType: "user", targetId: userId, reason, before: u, after: { ...u, status: "banned" } });
  return { message: "User has been banned successfully", user: userView({ ...u, status: "banned" }) };
});

export const unbanUser = adminCommand("unban_user", async (tx, actor, { userId, reason }: { userId: number; reason?: string | null }) => {
  const u = await lockUser(tx, userId);
  if (u.status !== "banned") throw conflict("NOT_BANNED", "User is not banned");
  await tx.update(users).set({ status: "active" }).where(eq(users.id, userId));
  await recordAdminAction(tx, { actor, action: "user.unban", targetType: "user", targetId: userId, reason, before: u, after: { ...u, status: "active" } });
  return { message: "User has been unbanned successfully", user: userView({ ...u, status: "active" }) };
});

export const changeRole = adminCommand("change_role", async (tx, actor, { userId, role, reason }: { userId: number; role: string; reason?: string | null }) => {
  if (!isRole(role)) throw new AppError(400, "VALIDATION_ERROR", "Invalid role");
  if (userId === actor.id) throw new AppError(400, "CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role");
  const u = await lockUser(tx, userId);
  if (u.role === role) return { message: "User role unchanged", user: userView(u) };
  await tx.update(users).set({ role }).where(eq(users.id, userId));
  await recordAdminAction(tx, { actor, action: "user.role_change", targetType: "user", targetId: userId, reason, before: u, after: { ...u, role } });
  return { message: "User role updated successfully", user: userView({ ...u, role }) };
});

// --- seller requests (rejected rows are KEPT: the 7-day reapply rule reads them) ---
const lockRequest = async (tx: Tx, id: number) => {
  const [r] = await tx.select().from(sellerRequests).where(eq(sellerRequests.id, id)).for("update");
  if (!r) throw notFound("Request");
  if (r.status !== "pending") throw conflict("ALREADY_PROCESSED", "This request has already been processed");
  return r;
};

export const approveSellerRequest = adminCommand("approve_seller", async (tx, actor, { requestId, note }: { requestId: number; note?: string | null }) => {
  const r = await lockRequest(tx, requestId);
  const expiry = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const [updated] = await tx.update(sellerRequests).set({ status: "approved", adminNote: note || null, sellerExpiryDate: expiry, updatedAt: new Date() }).where(eq(sellerRequests.id, requestId)).returning();
  const userId = r.userId as number; // every request row belongs to a user (legacy column is nullable)
  const u = await lockUser(tx, userId);
  if (u.role !== "admin") await tx.update(users).set({ role: "seller" }).where(eq(users.id, userId));
  await recordAdminAction(tx, { actor, action: "seller_request.approve", targetType: "seller_request", targetId: requestId, reason: note, before: r, after: updated });
  return { message: "Request approved. User is now a seller.", request: { id: requestId, userId: r.userId, status: "approved", sellerExpiryDate: expiry } };
});

export const rejectSellerRequest = adminCommand("reject_seller", async (tx, actor, { requestId, reason }: { requestId: number; reason?: string | null }) => {
  const r = await lockRequest(tx, requestId);
  const [updated] = await tx.update(sellerRequests).set({ status: "rejected", adminNote: reason || null, updatedAt: new Date() }).where(eq(sellerRequests.id, requestId)).returning();
  await recordAdminAction(tx, { actor, action: "seller_request.reject", targetType: "seller_request", targetId: requestId, reason, before: r, after: updated });
  return { message: "Request rejected.", request: { id: requestId, userId: r.userId, status: "rejected" } };
});

// --- categories ---
export const createCategory = adminCommand("create_category", async (tx, actor, { name, parentId = null, description = null }: { name: string; parentId?: number | null; description?: string | null }) => {
  name = need(name, "name");
  if (parentId) {
    const [parent] = await tx.select().from(categories).where(eq(categories.id, parentId));
    if (!parent) throw notFound("Parent category");
  }
  const [category] = await tx.insert(categories).values({ name, parentId: parentId || null, description: description || null }).returning();
  await recordAdminAction(tx, { actor, action: "category.create", targetType: "category", targetId: category.id, after: category });
  return { message: parentId ? "Subcategory created successfully" : "Category created successfully", category };
});

export const updateCategory = adminCommand("update_category", async (tx, actor, { categoryId, name, description }: { categoryId: number; name?: string; description?: string | null }) => {
  const [before] = await tx.select().from(categories).where(eq(categories.id, categoryId)).for("update");
  if (!before) throw notFound("Category");
  const set: Partial<typeof categories.$inferInsert> = {};
  if (name && name.trim()) set.name = name.trim();
  if (description !== undefined) set.description = description;
  if (Object.keys(set).length === 0) return { message: "Category updated successfully", category: before };
  const [category] = await tx.update(categories).set(set).where(eq(categories.id, categoryId)).returning();
  await recordAdminAction(tx, { actor, action: "category.update", targetType: "category", targetId: categoryId, before, after: category });
  return { message: "Category updated successfully", category };
});

/** Delete a category (and its empty subcategories). Every check runs before anything is deleted. */
export const deleteCategory = adminCommand("delete_category", async (tx, actor, { categoryId }: { categoryId: number }) => {
  const [category] = await tx.select().from(categories).where(eq(categories.id, categoryId)).for("update");
  if (!category) throw notFound("Category");
  const children = category.parentId ? [] : await tx.select().from(categories).where(eq(categories.parentId, categoryId));
  const ids = [categoryId, ...children.map((c) => c.id)];
  const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(auctions).where(inArray(auctions.categoryId, ids));
  if (n > 0) {
    throw new AppError(400, "CATEGORY_IN_USE", category.parentId ? "Cannot delete subcategory. It has products associated with it."
      : "Cannot delete category. It or one of its subcategories has products associated with it.");
  }
  for (const c of children) {
    await tx.delete(categories).where(eq(categories.id, c.id));
    await recordAdminAction(tx, { actor, action: "category.delete", targetType: "category", targetId: c.id, before: c, reason: `parent ${categoryId} deleted` });
  }
  await tx.delete(categories).where(eq(categories.id, categoryId));
  await recordAdminAction(tx, { actor, action: "category.delete", targetType: "category", targetId: categoryId, before: category });
  return { message: "Category deleted successfully" };
});

// --- listing reports ---
export async function createReport({ auctionId, reporter, reason, details }: { auctionId: number; reporter: Pick<UserRow, "id">; reason: string; details?: unknown }) {
  if (!REPORT_REASONS.includes(reason)) throw new AppError(400, "VALIDATION_ERROR", `reason must be one of ${REPORT_REASONS.join(", ")}`);
  const text = typeof details === "string" ? details.trim().slice(0, 1000) : "";
  if (reason === "other" && !text) throw new AppError(400, "VALIDATION_ERROR", "Please describe the problem");
  const [lot] = await db.select({ id: auctions.id, sellerId: auctions.sellerId }).from(auctions).where(eq(auctions.id, auctionId));
  if (!lot) throw notFound("Auction");
  if (lot.sellerId === reporter.id) throw new AppError(400, "OWN_LISTING", "You cannot report your own listing");
  const [row] = await db.insert(listingReports).values({ auctionId, reporterId: reporter.id, reason, details: text || null })
    .onConflictDoNothing().returning({ id: listingReports.id, status: listingReports.status, createdAt: listingReports.createdAt });
  if (!row) throw conflict("ALREADY_REPORTED", "You already reported this listing; an admin will review it");
  return { report: row };
}

/**
 * Resolve every open report of the lot behind `reportId`. action 'cancel_listing' runs the auction cancel command in the
 * SAME transaction (lock + active-only rule; bids/history kept, leader notified via outbox); 'dismiss' changes nothing else.
 */
export const resolveReport = adminCommand("resolve_report", async (tx, actor, { reportId, action, note }: { reportId: number; action: string; note?: string | null }) => {
  if (!["dismiss", "cancel_listing"].includes(action)) throw new AppError(400, "VALIDATION_ERROR", "action must be dismiss or cancel_listing");
  note = need(note, "note");
  const [report] = await tx.select().from(listingReports).where(eq(listingReports.id, reportId));
  if (!report) throw notFound("Report");
  if (action === "cancel_listing") await auctionCommands.cancelListing({ auctionId: report.auctionId, actor, reason: note }, tx); // locks the auction first
  const open = await tx.select().from(listingReports).where(and(eq(listingReports.auctionId, report.auctionId), eq(listingReports.status, "open"))).for("update");
  if (open.length === 0) throw conflict("ALREADY_RESOLVED", "These reports were already resolved");
  const status = action === "cancel_listing" ? "actioned" : "dismissed";
  await tx.update(listingReports).set({ status, resolution: note, resolvedBy: actor.id, resolvedAt: new Date() })
    .where(inArray(listingReports.id, open.map((r) => r.id)));
  for (const r of open) {
    await recordAdminAction(tx, { actor, action: `report.${status === "actioned" ? "action" : "dismiss"}`, targetType: "report", targetId: r.id, reason: note, before: r, after: { ...r, status } });
  }
  return { message: action === "cancel_listing" ? "Listing cancelled and reports closed" : "Reports dismissed", resolved: open.map((r) => r.id), status };
});

const reporter = alias(users, "reporter");
const seller = alias(users, "seller");
const reportColumns = {
  id: listingReports.id, auctionId: listingReports.auctionId, reason: listingReports.reason, details: listingReports.details, status: listingReports.status,
  resolution: listingReports.resolution, resolvedAt: listingReports.resolvedAt, createdAt: listingReports.createdAt,
  reporter: reporter.username, lotTitle: auctions.title, lotStatus: auctions.status, lotBidCount: auctions.bidCount, seller: seller.username,
};

export async function listReports({ status = "open", limit = 50 }: { status?: string; limit?: number | string } = {}) {
  const rows = await db.select(reportColumns).from(listingReports)
    .innerJoin(auctions, eq(auctions.id, listingReports.auctionId))
    .innerJoin(reporter, eq(reporter.id, listingReports.reporterId))
    .innerJoin(seller, eq(seller.id, auctions.sellerId))
    .where(status === "all" ? undefined : eq(listingReports.status, status))
    .orderBy(desc(listingReports.createdAt)).limit(Math.min(Number(limit) || 50, 200));
  return { items: rows };
}

const actorUser = alias(users, "actor");
export async function listAudit({ targetType, targetId, limit = 100 }: { targetType?: string; targetId?: number | string; limit?: number | string } = {}) {
  const rows = await db.select({
    id: adminAudit.id, action: adminAudit.action, targetType: adminAudit.targetType, targetId: adminAudit.targetId, reason: adminAudit.reason,
    before: adminAudit.before, after: adminAudit.after, createdAt: adminAudit.createdAt, actorId: adminAudit.actorId, actor: actorUser.username,
  }).from(adminAudit).leftJoin(actorUser, eq(actorUser.id, adminAudit.actorId))
    .where(and(targetType ? eq(adminAudit.targetType, targetType) : undefined, targetId ? eq(adminAudit.targetId, Number(targetId)) : undefined))
    .orderBy(desc(adminAudit.createdAt), desc(adminAudit.id)).limit(Math.min(Number(limit) || 100, 500));
  return { items: rows };
}
