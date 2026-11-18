import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { ADMIN_KEYS, isAdmin, useAdminAction } from "../../lib/admin.js";
import { ABtn, ErrorNote, Loading, PageHead, todaySG } from "../../components/admin/Admin";

/* SETTINGS — pause online orders (anyone on shift); slot limit and closed days (admins). */

export default function AdminSettings() {
  const { user } = useOutletContext();
  const admin = isAdmin(user);
  const settings = useQuery({ queryKey: ADMIN_KEYS.settings, queryFn: ({ signal }) => apiGet("/admin/settings", { signal }) });
  const action = useAdminAction([ADMIN_KEYS.settings]);
  const [message, setMessage] = useState("");
  const [capacity, setCapacity] = useState("0");
  const [newDate, setNewDate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setMessage(settings.data.pausedMessage);
    setCapacity(String(settings.data.slotCapacity));
  }, [settings.data]);

  const save = (body) => {
    setSaved(false);
    action.mutate({ method: "PATCH", path: "/admin/settings", body }, { onSuccess: () => setSaved(true) });
  };

  if (settings.isLoading) return <Loading />;
  if (settings.isError) return <ErrorNote error={settings.error} />;
  const s = settings.data;

  return (
    <>
      <PageHead title="Settings" />
      <ErrorNote error={action.error} />
      {saved && <p className="falert falert--info" role="status">Saved.</p>}

      <section className="aset">
        <h3 className="adm__sub">Online orders</h3>
        <p className="adm__hint">Kitchen too busy? Pause pickup orders. The website shows your message until you turn them back on.</p>
        <input className="adm__input" aria-label="Message shown while paused" placeholder="Message, e.g. Back at 7pm. Walk-ins welcome!" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="acard__actions">
          {s.ordersPaused ? (
            <ABtn tone="primary" disabled={action.isPending} onClick={() => save({ ordersPaused: false })}>Turn online orders back on</ABtn>
          ) : (
            <ABtn tone="danger" disabled={action.isPending} onClick={() => save({ ordersPaused: true, pausedMessage: message })}>Pause online orders</ABtn>
          )}
          {s.ordersPaused && message !== s.pausedMessage && <ABtn onClick={() => save({ pausedMessage: message })}>Update message</ABtn>}
        </div>
      </section>

      <section className="aset">
        <h3 className="adm__sub">Pickup slot limit</h3>
        <p className="adm__hint">How many orders the kitchen can take per pickup time slot. 0 means no limit.</p>
        <div className="acard__actions">
          <input className="adm__input adm__input--sm" aria-label="Orders per pickup time slot" type="number" min="0" max="100" disabled={!admin} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          {admin && Number(capacity) !== s.slotCapacity && <ABtn tone="primary" onClick={() => save({ slotCapacity: Math.max(0, Math.trunc(Number(capacity))) })}>Save</ABtn>}
        </div>
      </section>

      <section className="aset">
        <h3 className="adm__sub">Closed days</h3>
        <p className="adm__hint">No pickup orders or table bookings on these dates (public holidays, private events).</p>
        <ul className="aset__dates">
          {s.closedDates.filter((d) => d >= todaySG()).map((d) => (
            <li key={d}>
              {new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${d}T12:00:00`))}
              {admin && <button type="button" aria-label={`Reopen ${d}`} onClick={() => save({ closedDates: s.closedDates.filter((x) => x !== d) })}>×</button>}
            </li>
          ))}
          {s.closedDates.filter((d) => d >= todaySG()).length === 0 && <li className="aset__none">None coming up.</li>}
        </ul>
        {admin && (
          <div className="acard__actions">
            <input className="adm__input" aria-label="Day to close" type="date" min={todaySG()} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <ABtn tone="primary" disabled={!newDate} onClick={() => { save({ closedDates: [...s.closedDates.filter((d) => d >= todaySG()), newDate] }); setNewDate(""); }}>Close this day</ABtn>
          </div>
        )}
      </section>
    </>
  );
}
