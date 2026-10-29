// Order state machine. Pure: decides whether a command is legal and what it changes.
import { AppError } from "../utils/errors.js";

export const PAYMENT_WINDOW_HOURS = Number(process.env.PAYMENT_WINDOW_HOURS || 48);
export const paymentDueAt = (from) => new Date(new Date(from).getTime() + PAYMENT_WINDOW_HOURS * 3600 * 1000);

export const TERMINAL = new Set(["completed", "cancelled", "payment_expired"]);

export const need = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") throw new AppError(400, "VALIDATION_ERROR", `${field} is required`);
  return value.trim();
};

const invalid = (order, command) => new AppError(409, "INVALID_TRANSITION", `Cannot ${command.replace(/_/g, " ")} while the order is ${order.status.replace(/_/g, " ")}`);
const forbidden = (message) => new AppError(403, "FORBIDDEN", message);

/**
 * order: row; actor: { type: 'user'|'system'|'adapter', id?, role? }; now: Date (DB clock); payload: command input.
 * Returns { to, set, auction?: 'sold'|'cancelled'|'keep', reason }.
 */
export function planTransition(order, command, actor, now, payload = {}) {
  const isBuyer = actor.type === "user" && actor.id === order.buyerId;
  const isSeller = actor.type === "user" && actor.id === order.sellerId;
  const isAdmin = actor.type === "user" && actor.role === "admin";
  const pastDue = order.paymentDueAt && new Date(now) >= new Date(order.paymentDueAt);

  switch (command) {
    case "submit_payment": { // manual mode: buyer attaches proof before the deadline
      if (!isBuyer) throw forbidden("Only buyer can submit payment");
      if (order.status !== "pending_payment") throw invalid(order, command);
      if (order.paymentMode !== "manual") throw new AppError(409, "PAYMENT_MODE", "This order is not paid by manual proof");
      if (pastDue) throw new AppError(409, "PAYMENT_WINDOW_CLOSED", "The payment window for this order has closed");
      return {
        to: "pending_confirmation", auction: "keep",
        set: { paymentProofUrl: need(payload.paymentProofUrl, "paymentProofUrl"), shippingAddress: need(payload.shippingAddress, "shippingAddress"), buyerPhone: need(payload.buyerPhone, "buyerPhone"), paymentSubmittedAt: now },
      };
    }
    case "confirm_with_shipping": { // manual mode: seller confirms the money arrived and ships in one step
      if (!isSeller) throw forbidden("Only seller can confirm payment");
      if (order.status !== "pending_confirmation") throw invalid(order, command);
      const shippingProofUrl = payload.shippingProofUrl?.trim?.() || null;
      const trackingNumber = payload.trackingNumber?.trim?.() || null;
      if (!shippingProofUrl && !trackingNumber) throw new AppError(400, "VALIDATION_ERROR", "A tracking number or shipping proof is required");
      return { to: "pending_receipt", auction: "sold", set: { paymentConfirmedAt: now, shippingProofUrl, trackingNumber, shippingSubmittedAt: now } };
    }
    case "submit_shipping": { // payment already recorded (adapter / legacy pending_delivery)
      if (!isSeller) throw forbidden("Only seller can submit shipping");
      if (order.status !== "pending_delivery") throw invalid(order, command);
      const shippingProofUrl = payload.shippingProofUrl?.trim?.() || null;
      const trackingNumber = payload.trackingNumber?.trim?.() || null;
      if (!shippingProofUrl && !trackingNumber) throw new AppError(400, "VALIDATION_ERROR", "A tracking number or shipping proof is required");
      return { to: "pending_receipt", auction: "sold", set: { shippingProofUrl, trackingNumber, shippingSubmittedAt: now } };
    }
    case "payment_succeeded": { // adapter only
      if (actor.type !== "adapter") throw forbidden("Only the payment adapter can record a payment");
      if (order.status !== "pending_payment") throw invalid(order, command);
      if (pastDue) throw new AppError(409, "PAYMENT_WINDOW_CLOSED", "The payment window for this order has closed");
      return { to: "pending_delivery", auction: "sold", set: { paymentConfirmedAt: now } };
    }
    case "confirm_receipt": {
      if (!isBuyer) throw forbidden("Only buyer can confirm receipt");
      if (order.status !== "pending_receipt") throw invalid(order, command);
      return { to: "pending_review", auction: "keep", set: { receiptConfirmedAt: now } };
    }
    case "cancel": { // seller only while unpaid; admin until shipping. A reason is mandatory; no automatic negative review.
      if (!isSeller && !isAdmin) throw forbidden("Only the seller or an admin can cancel an order"); // authorise before validating input
      const reason = need(payload.reason, "reason");
      const sellerOk = isSeller && order.status === "pending_payment";
      const adminOk = isAdmin && ["pending_payment", "pending_confirmation", "pending_delivery"].includes(order.status);
      if (TERMINAL.has(order.status)) throw invalid(order, command);
      if (!sellerOk && !adminOk) throw new AppError(409, "INVALID_TRANSITION", `A${isAdmin ? "n admin" : " seller"} cannot cancel an order that is ${order.status.replace(/_/g, " ")}`);
      return { to: "cancelled", auction: "cancel_if_sold", reason, set: { cancelledAt: now, cancelledBy: actor.id, cancelReason: reason, closeReason: "cancelled" } };
    }
    case "expire": { // worker: unpaid orders only, only after the deadline
      if (actor.type !== "system") throw forbidden("Only the system can expire an order");
      if (order.status !== "pending_payment") throw invalid(order, command);
      if (!order.paymentDueAt || !pastDue) throw new AppError(409, "NOT_DUE", "The payment window is still open");
      return { to: "payment_expired", auction: "keep", reason: "payment window elapsed", set: { closeReason: "payment_expired" } };
    }
    case "complete": { // both reviews exist (reviewCommands decides when to call it)
      if (actor.type !== "system" && !isBuyer && !isSeller) throw forbidden("Access denied");
      if (order.status !== "pending_review") throw invalid(order, command);
      return { to: "completed", auction: "keep", set: {} };
    }
    default:
      throw new AppError(400, "UNKNOWN_COMMAND", `Unknown order command ${command}`);
  }
}
