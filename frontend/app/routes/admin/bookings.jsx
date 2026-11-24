import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { ADMIN_KEYS, useAdminAction } from "../../lib/admin.js";
import { ABtn, Empty, ErrorNote, Loading, PageHead, Pill, TwoTap, sgTime, todaySG } from "../../components/admin/Admin";

/* TABLE BOOKINGS — one day at a time. Confirm or decline requests, then mark arrivals. */

const LABEL = { REQUESTED: "Request", CONFIRMED: "Confirmed", DECLINED: "Declined", CANCELLED: "Cancelled", COMPLETED: "Arrived", NO_SHOW: "No-show" };

const shift = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function AdminBookings() {
  const [date, setDate] = useState(todaySG);
  const [tables, setTables] = useState({});
  const list = useQuery({
    queryKey: ADMIN_KEYS.bookings(date),
    queryFn: ({ signal }) => apiGet(`/admin/reservations?date=${date}`, { signal }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const action = useAdminAction([["admin", "bookings"]]);
  const run = (code, act, body = {}) => action.mutate({ path: `/admin/reservations/${code}/${act}`, body });

  return (
    <>
      <PageHead title="Bookings">
        <ABtn onClick={() => setDate(shift(date, -1))} aria-label="Previous day">←</ABtn>
        <input type="date" aria-label="Day" className="adm__input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <ABtn onClick={() => setDate(shift(date, 1))} aria-label="Next day">→</ABtn>
        <ABtn onClick={() => setDate(todaySG())}>Today</ABtn>
      </PageHead>
      <ErrorNote error={action.error} />
      {list.isLoading ? <Loading /> : list.isError ? <ErrorNote error={list.error} /> : (
        <>
          <p className="adm__stat">
            <b>{list.data.held}</b> of {list.data.totalTables} tables held · {list.data.bookings.filter((b) => ["REQUESTED", "CONFIRMED"].includes(b.status)).reduce((s, b) => s + b.partySize, 0)} guests expected
          </p>
          {list.data.bookings.length === 0 ? <Empty>No bookings on this day.</Empty> : (
            <div className="adm__list">
              {list.data.bookings.map((b) => (
                <article key={b.code} className="acard">
                  <header className="acard__head">
                    <b className="acard__code">{sgTime(b.startsAt)}</b>
                    <span className="acard__time">{b.partySize} guests{b.tableLabel ? ` · Table ${b.tableLabel}` : ""}</span>
                    <Pill status={b.status}>{LABEL[b.status]}</Pill>
                  </header>
                  <p className="acard__who">
                    {b.name} · <a href={`tel:${b.phone}`}>{b.phone}</a> · <a href={`mailto:${b.email}`}>{b.email}</a>
                  </p>
                  {(b.occasion || b.notes) && <p className="acard__note">{[b.occasion, b.notes].filter(Boolean).join(" · ")}</p>}
                  <footer className="acard__foot">
                    <span className="acard__ref">{b.code}</span>
                    <div className="acard__actions">
                      {b.status === "REQUESTED" && (
                        <>
                          <input className="adm__input adm__input--sm" aria-label={`Table for ${b.name}`} placeholder="Table" value={tables[b.code] ?? ""} onChange={(e) => setTables({ ...tables, [b.code]: e.target.value })} />
                          <ABtn tone="primary" disabled={action.isPending} onClick={() => run(b.code, "confirm", tables[b.code] ? { table: tables[b.code] } : {})}>Confirm</ABtn>
                          <TwoTap label="Decline" confirmLabel="Decline?" onConfirm={() => run(b.code, "decline", { reason: "Fully booked at that time" })} />
                        </>
                      )}
                      {b.status === "CONFIRMED" && (
                        <>
                          <ABtn tone="primary" disabled={action.isPending} onClick={() => run(b.code, "complete")}>Arrived</ABtn>
                          <TwoTap label="No-show" confirmLabel="Mark no-show?" onConfirm={() => run(b.code, "no-show")} />
                          <TwoTap label="Cancel" confirmLabel="Cancel booking?" onConfirm={() => run(b.code, "cancel", { reason: "Cancelled by the restaurant" })} />
                        </>
                      )}
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
