import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { ADMIN_KEYS, isAdmin, playChime, useAdminAction } from "../../lib/admin.js";
import { STATUS_LABEL } from "../../lib/orders.js";
import { cents } from "../../lib/format.js";
import { ABtn, Empty, ErrorNote, Loading, PageHead, Pill, TwoTap, sgTime } from "../../components/admin/Admin";

/* ORDERS BOARD — new → preparing → ready → picked up. Refreshes every 10s and chimes on new orders. */

const NEXT_LABEL = { PLACED: "Start preparing", PREPARING: "Mark ready", READY: "Picked up" };
const COLUMNS = [
  ["PLACED", "New"],
  ["PREPARING", "Preparing"],
  ["READY", "Ready for pickup"],
];

export default function AdminOrders() {
  const { user } = useOutletContext();
  const [sound, setSound] = useState(true);
  const board = useQuery({
    queryKey: ADMIN_KEYS.orders,
    queryFn: ({ signal }) => apiGet("/admin/orders", { signal }),
    refetchInterval: 10_000,
  });
  const action = useAdminAction([ADMIN_KEYS.orders]);

  // chime when a new order code shows up
  const seen = useRef(null);
  useEffect(() => {
    const codes = (board.data?.active ?? []).filter((o) => o.status === "PLACED").map((o) => o.code);
    if (seen.current && sound && codes.some((c) => !seen.current.has(c))) playChime();
    if (board.data) seen.current = new Set(codes);
  }, [board.data, sound]);

  const run = (path, body) => action.mutate({ path, body });

  return (
    <>
      <PageHead title="Orders">
        <label className="adm__check">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sound for new orders
        </label>
      </PageHead>
      <ErrorNote error={action.error} />
      {board.isLoading ? <Loading /> : board.isError ? <ErrorNote error={board.error} /> : (
        <>
          <div className="aboard">
            {COLUMNS.map(([status, title]) => {
              const list = board.data.active.filter((o) => o.status === status);
              return (
                <div key={status} className={`aboard__col aboard__col--${status.toLowerCase()}`}>
                  <h3 className="aboard__title">{title} <span>{list.length}</span></h3>
                  {list.length === 0 && <Empty>Nothing here.</Empty>}
                  {list.map((o) => (
                    <OrderCard key={o.code} order={o}>
                      <ABtn tone="primary" disabled={action.isPending} onClick={() => run(`/admin/orders/${o.code}/advance`)}>{NEXT_LABEL[o.status]}</ABtn>
                      <TwoTap label="Cancel" confirmLabel="Cancel order?" disabled={action.isPending} onConfirm={() => run(`/admin/orders/${o.code}/cancel`, { reason: "Cancelled by the restaurant" })} />
                    </OrderCard>
                  ))}
                </div>
              );
            })}
          </div>

          <h3 className="adm__sub">Finished today</h3>
          {board.data.done.length === 0 ? <Empty>No finished orders yet today.</Empty> : (
            <div className="adm__list">
              {board.data.done.map((o) => (
                <OrderCard key={o.code} order={o} compact>
                  {isAdmin(user) && o.paidAt && o.refundedCents < o.totalCents && o.paymentProvider && (
                    <TwoTap label="Refund in full" confirmLabel={`Refund ${cents(o.totalCents - o.refundedCents)}?`} disabled={action.isPending} onConfirm={() => run(`/admin/orders/${o.code}/refund`)} />
                  )}
                </OrderCard>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function OrderCard({ order: o, children, compact }) {
  return (
    <article className={`acard ${compact ? "acard--compact" : ""}`}>
      <header className="acard__head">
        <b className="acard__code">{o.code.slice(-4)}</b>
        <span className="acard__time">Pickup {sgTime(o.pickupAt)}</span>
        <Pill status={o.status}>{STATUS_LABEL[o.status] ?? o.status}</Pill>
      </header>
      <p className="acard__who">
        {o.customerName}{o.member && <span className="acard__tag">Member</span>} · <a href={`tel:${o.customerPhone}`}>{o.customerPhone}</a>
      </p>
      {!compact && (
        <ul className="acard__items">
          {o.items.map((i, n) => (
            <li key={n}>
              <b>{i.quantity}×</b> {i.name}
              {(i.variant || i.options) && <small> · {[i.variant, ...Object.values(i.options ?? {})].filter(Boolean).join(" · ")}</small>}
              {i.notes && <em className="acard__note">“{i.notes}”</em>}
            </li>
          ))}
        </ul>
      )}
      {o.notes && !compact && <p className="acard__note">Note: {o.notes}</p>}
      <footer className="acard__foot">
        <span>
          {cents(o.totalCents)}
          {o.pointsRedeemed > 0 && <small> · {o.pointsRedeemed} pts used</small>}
          {o.refundedCents > 0 && <small> · {cents(o.refundedCents)} refunded</small>}
        </span>
        <div className="acard__actions">{children}</div>
      </footer>
    </article>
  );
}
