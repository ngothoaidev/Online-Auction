import { test } from "node:test";
import assert from "node:assert/strict";
import { planTransition, TERMINAL } from "../../domain/orderTransitions.ts";
import type { Actor, OrderCommand, OrderLike, OrderStatus, TransitionPayload } from "../../domain/orderTransitions.ts";
import type { AppError } from "../../utils/errors.ts";

const NOW = new Date("2026-03-01T12:00:00Z");
const base = { id: 1, buyerId: 10, sellerId: 20, paymentMode: "manual", paymentDueAt: new Date("2026-03-02T12:00:00Z") };
const order = (status: OrderStatus | null, extra: Partial<OrderLike> = {}): OrderLike => ({ ...base, status, ...extra });
const buyer: Actor = { type: "user", id: 10, role: "buyer" };
const seller: Actor = { type: "user", id: 20, role: "seller" };
const admin: Actor = { type: "user", id: 99, role: "admin" };
const stranger: Actor = { type: "user", id: 77, role: "buyer" };
const system: Actor = { type: "system" };
const adapter: Actor = { type: "adapter" };

const proof = { paymentProofUrl: "https://x/p.png", shippingAddress: "1 Main St", buyerPhone: "0123456789" };
const ship = { trackingNumber: "TRK1" };

type Spec = { payload: TransitionPayload; from: OrderStatus[]; actors: Actor[]; to: OrderStatus; expired?: boolean };
const COMMANDS: Record<string, Spec> = {
  submit_payment: { payload: proof, from: ["pending_payment"], actors: [buyer], to: "pending_confirmation" },
  confirm_with_shipping: { payload: ship, from: ["pending_confirmation"], actors: [seller], to: "pending_receipt" },
  submit_shipping: { payload: ship, from: ["pending_delivery"], actors: [seller], to: "pending_receipt" },
  payment_succeeded: { payload: {}, from: ["pending_payment"], actors: [adapter], to: "pending_delivery" },
  confirm_receipt: { payload: {}, from: ["pending_receipt"], actors: [buyer], to: "pending_review" },
  expire: { payload: {}, from: ["pending_payment"], actors: [system], to: "payment_expired", expired: true },
  complete: { payload: {}, from: ["pending_review"], actors: [system, buyer, seller], to: "completed" },
};
const ALL_STATUS: OrderStatus[] = ["pending_payment", "pending_confirmation", "pending_delivery", "pending_receipt", "pending_review", "completed", "cancelled", "payment_expired"];

test("transition matrix: every command is legal exactly from its source states, for its actors, to its target", () => {
  for (const [command, spec] of Object.entries(COMMANDS)) {
    for (const status of ALL_STATUS) {
      for (const actor of [buyer, seller, admin, stranger, system, adapter]) {
        const o = order(status, spec.expired ? { paymentDueAt: new Date(NOW.getTime() - 1) } : {});
        const legal = spec.from.includes(status) && spec.actors.includes(actor);
        if (legal) assert.equal(planTransition(o, command as OrderCommand, actor, NOW, spec.payload).to, spec.to, `${command} ${status} ${actor.type}:${actor.id}`);
        else assert.throws(() => planTransition(o, command as OrderCommand, actor, NOW, spec.payload), (e: AppError) => [403, 409].includes(e.status), `${command} from ${status} by ${actor.type}:${actor.id} must be refused`);
      }
    }
  }
});

test("terminal states accept nothing (fulfilment, cancel, payment)", () => {
  for (const status of TERMINAL) {
    for (const [command, spec] of Object.entries({ ...COMMANDS, cancel: { payload: { reason: "x" }, actors: [seller, admin] } })) {
      for (const actor of [buyer, seller, admin, system, adapter]) {
        assert.throws(() => planTransition(order(status, { paymentDueAt: new Date(NOW.getTime() - 1) }), command as OrderCommand, actor, NOW, spec.payload), (e: AppError) => [403, 409].includes(e.status), `${command}/${status}`);
      }
    }
  }
});

test("cancel: seller only while unpaid, admin until shipping, reason mandatory", () => {
  const cancel = (status: OrderStatus, actor: Actor, reason: string | null = "item lost") => planTransition(order(status), "cancel", actor, NOW, { reason });
  assert.equal(cancel("pending_payment", seller).to, "cancelled");
  assert.equal(cancel("pending_payment", admin).to, "cancelled");
  for (const s of ["pending_confirmation", "pending_delivery"] as const) {
    assert.equal(cancel(s, admin).to, "cancelled");
    assert.throws(() => cancel(s, seller), (e: AppError) => e.status === 409);
  }
  for (const s of ["pending_receipt", "pending_review"] as const) assert.throws(() => cancel(s, admin), (e: AppError) => e.status === 409);
  assert.throws(() => cancel("pending_payment", buyer), (e: AppError) => e.status === 403);
  assert.throws(() => cancel("pending_payment", seller, "  "), (e: AppError) => e.code === "VALIDATION_ERROR");
  assert.throws(() => cancel("pending_payment", seller, null), (e: AppError) => e.code === "VALIDATION_ERROR");
  assert.equal(cancel("pending_confirmation", admin).auction, "cancel_if_sold");
});

test("payment deadline: proof and adapter payments are refused after dueAt; expiry only after dueAt", () => {
  const late = order("pending_payment", { paymentDueAt: new Date(NOW.getTime() - 1) });
  assert.throws(() => planTransition(late, "submit_payment", buyer, NOW, proof), (e: AppError) => e.code === "PAYMENT_WINDOW_CLOSED");
  assert.throws(() => planTransition(late, "payment_succeeded", adapter, NOW, {}), (e: AppError) => e.code === "PAYMENT_WINDOW_CLOSED");
  assert.equal(planTransition(late, "expire", system, NOW).to, "payment_expired");
  const open = order("pending_payment");
  assert.throws(() => planTransition(open, "expire", system, NOW), (e: AppError) => e.code === "NOT_DUE");
  const edge = order("pending_payment", { paymentDueAt: NOW });
  assert.equal(planTransition(edge, "expire", system, NOW).to, "payment_expired", "equality counts as elapsed");
  assert.throws(() => planTransition(edge, "submit_payment", buyer, NOW, proof), (e: AppError) => e.code === "PAYMENT_WINDOW_CLOSED");
});

test("payload validation: proof needs address+phone, shipping needs tracking or proof", () => {
  for (const bad of [{}, { ...proof, shippingAddress: " " }, { ...proof, buyerPhone: undefined }, { shippingAddress: "x", buyerPhone: "1" }]) {
    assert.throws(() => planTransition(order("pending_payment"), "submit_payment", buyer, NOW, bad), (e: AppError) => e.code === "VALIDATION_ERROR");
  }
  assert.throws(() => planTransition(order("pending_confirmation"), "confirm_with_shipping", seller, NOW, {}), (e: AppError) => e.code === "VALIDATION_ERROR");
  assert.equal(planTransition(order("pending_confirmation"), "confirm_with_shipping", seller, NOW, { shippingProofUrl: "https://x/s.png" }).to, "pending_receipt");
});

test("auction mapping: sold when payment is recorded, untouched on proof submission and expiry", () => {
  assert.equal(planTransition(order("pending_confirmation"), "confirm_with_shipping", seller, NOW, ship).auction, "sold");
  assert.equal(planTransition(order("pending_payment"), "payment_succeeded", adapter, NOW).auction, "sold");
  assert.equal(planTransition(order("pending_payment"), "submit_payment", buyer, NOW, proof).auction, "keep");
  assert.equal(planTransition(order("pending_payment", { paymentDueAt: new Date(NOW.getTime() - 1) }), "expire", system, NOW).auction, "keep");
});

test("mock/sandbox orders cannot be paid by manual proof (no mixing of payment modes)", () => {
  assert.throws(() => planTransition(order("pending_payment", { paymentMode: "mock" }), "submit_payment", buyer, NOW, proof), (e: AppError) => e.code === "PAYMENT_MODE");
});
