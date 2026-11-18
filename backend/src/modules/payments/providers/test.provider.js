// Local testing only (refused in production by config/env.js): the Pay button succeeds straight away.
export const testProvider = {
  name: "test",

  async createPayment(order) {
    return {
      providerOrderId: `test_${order.code}`,
      client: { provider: "test" },
    };
  },

  async refund(paymentId, amountCents) {
    return { refundId: `test_refund_${paymentId}_${amountCents}`, status: "succeeded" };
  },

  async describe() {
    return { state: "open", client: { provider: "test" } };
  },

  async cancel() {
    return { state: "expired" };
  },

  async confirmPayment(order) {
    return { paid: true, paymentId: `test_pay_${order.code}`, amountCents: order.totalCents, currency: "sgd" };
  },
};
