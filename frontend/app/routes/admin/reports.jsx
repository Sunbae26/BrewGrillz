import { useState } from "react";
import { useOutletContext } from "react-router";
import { isAdmin } from "../../lib/admin.js";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { cents } from "../../lib/format.js";
import { ABtn, AdminOnly, Empty, ErrorNote, Loading, PageHead } from "../../components/admin/Admin";

/* REPORTS — paid pickup orders, bookings and new Rewards members for today, 7 or 30 days. */

const RANGES = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
];

export default function AdminReports() {
  const { user } = useOutletContext();
  if (!isAdmin(user)) return <AdminOnly title="Reports" />;
  return <Reports />;
}

function Reports() {
  const [days, setDays] = useState(7);
  const report = useQuery({ queryKey: ["admin", "reports", days], queryFn: ({ signal }) => apiGet(`/admin/reports?days=${days}`, { signal }) });
  const r = report.data;
  const peak = Math.max(1, ...(r?.daily ?? []).map((d) => d.revenueCents));

  return (
    <>
      <PageHead title="Reports">
        {RANGES.map(([value, label]) => (
          <ABtn key={value} tone={days === value ? "primary" : "ghost"} onClick={() => setDays(value)}>{label}</ABtn>
        ))}
      </PageHead>
      {report.isLoading ? <Loading /> : report.isError ? <ErrorNote error={report.error} /> : (
        <>
          <div className="astats">
            <Stat label="Online sales" value={cents(r.revenueCents)} />
            <Stat label="Paid orders" value={r.orders} />
            <Stat label="Average order" value={cents(r.averageCents)} />
            <Stat label="Points discounts" value={cents(r.discountCents)} />
            <Stat label="Orders by members" value={`${r.memberOrders} / ${r.orders}`} />
            <Stat label="New members" value={r.newMembers} />
            <Stat label="Table bookings" value={`${r.bookings.count} · ${r.bookings.guests} guests`} />
            <Stat label="No-shows" value={r.bookings.noShows} />
          </div>

          {days > 1 && (
            <>
              <h3 className="adm__sub">Sales by day</h3>
              <div className="achart" role="img" aria-label="Online sales by day">
                {r.daily.map((d) => (
                  <div key={d.date} className="achart__col" title={`${d.date}: ${cents(d.revenueCents)} from ${d.orders} orders`}>
                    <span className="achart__bar" style={{ height: `${(d.revenueCents / peak) * 100}%` }} />
                    <small>{Number(d.date.slice(8))}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="adm__sub">Top dishes</h3>
          {r.topDishes.length === 0 ? <Empty>No paid orders in this period.</Empty> : (
            <ol className="atop">
              {r.topDishes.map((d) => (
                <li key={d.name}>
                  <span>{d.name}</span>
                  <b>{d.quantity} sold</b>
                  <span>{cents(d.revenueCents)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}

const Stat = ({ label, value }) => (
  <div className="astat">
    <small>{label}</small>
    <b>{value}</b>
  </div>
);
