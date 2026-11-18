import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useCart, lineExtras } from "../lib/cart.jsx";
import { apiPost } from "../lib/api.js";
import { saveLocalOrder } from "../lib/localOrders.js";
import { FINAL, STATUS_LABEL, STEPS, fetchOrder } from "../lib/orders.js";
import { cents, formatPickup, time } from "../lib/format.js";
import { Button, Flame } from "../components/ui/ui";
import { site } from "../config/site";
import MoCoLink from "../motion/MoCoLink";

/* ORDER STATUS — the private link from the email/WhatsApp (/order/BG-…?t=…). Updates by itself. */

export const meta = ({ params }) => [{ title: `Order ${params.code} | BrewGrillz` }, { name: "robots", content: "noindex" }];

export default function OrderStatus() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const justPaid = params.has("paid");
  const { clear, ready } = useCart();

  const { data: order, error, isLoading } = useQuery({
    queryKey: ["order", code, token],
    queryFn: async ({ signal }) => {
      const current = await fetchOrder(code, token, signal);
      // back from Stripe before the webhook arrived: ask the API to check with Stripe
      if (current.status === "PENDING_PAYMENT" && justPaid) {
        const checked = await apiPost(`/orders/${code}/check?t=${encodeURIComponent(token)}`, {}).catch(() => null);
        if (checked && checked.status !== current.status) return fetchOrder(code, token, signal);
      }
      return current;
    },
    enabled: Boolean(token),
    retry: (count, err) => err?.status !== 404 && count < 3,
    // quickly while the payment is confirming, then every 20 seconds until it's collected
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || FINAL.includes(status)) return false;
      return status === "PENDING_PAYMENT" ? 3000 : 20_000;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (justPaid && ready && order && order.status !== "PENDING_PAYMENT") clear(); // paid: empty the cart
  }, [justPaid, ready, order, clear]);

  useEffect(() => {
    if (order) saveLocalOrder({ code, token, at: order.createdAt });
  }, [order, code, token]);

  return (
    <section className="track">
      <div className="container track__wrap">
        {isLoading ? (
          <div className="track__loading"><Flame /> Loading your order…</div>
        ) : !order ? (
          <div className="track__missing">
            <h1 className="display track__title">{error?.status === 404 || !token ? "Order not found" : "Can’t load your order"}</h1>
            <p className="lead">
              {error?.status === 404 || !token
                ? `This link doesn’t match an order. Check the link in your email, or find it with your order number.`
                : "We’ll keep trying. Check your connection, or WhatsApp us on " + site.whatsapp + "."}
            </p>
            <Button to="/track" variant="ghost">Find my order</Button>
          </div>
        ) : (
          <OrderCard order={order} />
        )}
      </div>
    </section>
  );
}

function OrderCard({ order }) {
  const reached = {};
  for (const e of order.events) reached[e.status] ??= e.at;
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const off = order.status === "CANCELLED" || order.status === "REFUNDED";
  const pending = order.status === "PENDING_PAYMENT";

  return (
    <div className="track__card">
      <header className="track__head">
        <span className="eyebrow">Order {order.code}</span>
        <h1 className="display track__title">
          {order.status === "READY" ? <>Ready, <span className="text-red">{order.customerName}!</span></>
            : off ? STATUS_LABEL[order.status]
            : pending ? <>Almost <span className="text-red">there</span></>
            : <>Thanks, <span className="text-red">{order.customerName}!</span></>}
        </h1>
        <p className="track__pickup">Pickup <b>{formatPickup(order.pickupAt)}</b> · 163 Rochor Road, Bugis</p>
        {order.paid && !off && <p className="track__note">We’ve emailed your receipt. Show your order number <b>{order.code}</b> at the counter when you collect.</p>}
      </header>

      {pending ? (
        <p className="track__wait"><Flame /> Confirming your payment… this page updates by itself.</p>
      ) : off ? (
        <p className="track__off">
          {order.status === "REFUNDED"
            ? "Your refund has been issued. It can take 5–10 working days to show on your statement."
            : order.paid
              ? "This order was cancelled. Your payment will be refunded within 5–10 working days."
              : "This order was cancelled and no payment was taken."}{" "}
          Questions? WhatsApp us on {site.whatsapp}.
        </p>
      ) : (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`step ${i < idx ? "is-done" : ""} ${i === idx ? "is-now" : ""}`}>
              <span className="step__dot" aria-hidden="true">{i < idx ? "✓" : i + 1}</span>
              <span className="step__label">{s.label}</span>
              {reached[s.key] && <span className="step__time">{time(reached[s.key])}</span>}
            </li>
          ))}
        </ol>
      )}

      <ul className="track__items">
        {order.items.map((item, n) => (
          <li key={n}>
            <span>
              {item.quantity} × {item.name}
              {lineExtras(item) ? <small> · {lineExtras(item)}</small> : null}
              {item.notes ? <small> · “{item.notes}”</small> : null}
            </span>
            <span>{cents(item.lineTotalCents)}</span>
          </li>
        ))}
        {order.discountCents > 0 && <li><span>Rewards ({order.pointsRedeemed} pts)</span><span>−{cents(order.discountCents)}</span></li>}
        <li className="track__total"><span>{order.paid ? "Total paid" : "Total"} <small>incl. GST</small></span><b>{cents(order.totalCents)}</b></li>
        {order.refundedCents > 0 && <li><span>Refunded</span><span>−{cents(order.refundedCents)}</span></li>}
      </ul>

      <div className="track__actions">
        <Button to="/menu" variant="ghost">Back to the menu</Button>
        <Button to={site.mapsUrl} variant="ghost">Directions</Button>
        <Button to={site.whatsappHref} variant="ghost">WhatsApp us</Button>
      </div>
      <p className="track__save">
        This page updates by itself. To come back to it later, use <MoCoLink to="/track">Track an order</MoCoLink> with your order number and email, or the link in your confirmation email.
      </p>
    </div>
  );
}
