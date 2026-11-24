import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { ADMIN_KEYS, useAdminAction } from "../../lib/admin.js";
import { ABtn, Empty, ErrorNote, Loading, PageHead, Pill, sgDay } from "../../components/admin/Admin";

/* EVENT ENQUIRIES — parties and private hire from the Events page. */

const STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "DECLINED", "CLOSED"];
const LABEL = { NEW: "New", CONTACTED: "Contacted", CONFIRMED: "Confirmed", DECLINED: "Declined", CLOSED: "Closed" };

export default function AdminEnquiries() {
  const [filter, setFilter] = useState("");
  const [notes, setNotes] = useState({});
  const list = useQuery({
    queryKey: [...ADMIN_KEYS.enquiries, filter],
    queryFn: ({ signal }) => apiGet(`/admin/enquiries${filter ? `?status=${filter}` : ""}`, { signal }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const action = useAdminAction([ADMIN_KEYS.enquiries]);
  const update = (code, body) => action.mutate({ method: "PATCH", path: `/admin/enquiries/${code}`, body });

  return (
    <>
      <PageHead title="Event enquiries">
        <div className="achips" role="group" aria-label="Show">
          {[["", "Open"], ...STATUSES.map((s) => [s, LABEL[s]])].map(([value, label]) => (
            <button key={value || "open"} type="button" className={`achip ${filter === value ? "is-on" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </PageHead>
      <ErrorNote error={action.error} />
      {list.isLoading ? <Loading /> : list.isError ? <ErrorNote error={list.error} /> : list.data.length === 0 ? <Empty>No enquiries here.</Empty> : (
        <div className="adm__list">
          {list.data.map((e) => (
            <article key={e.code} className="acard">
              <header className="acard__head">
                <b className="acard__code">{e.occasion}</b>
                <span className="acard__time">{e.eventDate} · {e.startTime} · {e.guests} guests{e.wholeVenue ? " · whole venue" : ""}</span>
                <Pill status={e.status === "NEW" ? "placed" : e.status}>{LABEL[e.status]}</Pill>
              </header>
              <p className="acard__who">
                {e.name} · <a href={`tel:${e.phone}`}>{e.phone}</a> · <a href={`mailto:${e.email}`}>{e.email}</a>
                {e.budget && <> · Budget {e.budget}</>}
              </p>
              {e.message && <p className="acard__note">“{e.message}”</p>}
              <div className="acard__notes">
                <input
                  className="adm__input"
                  aria-label="Team note"
                  placeholder="Team note (only staff see this)"
                  value={notes[e.code] ?? e.staffNote ?? ""}
                  onChange={(ev) => setNotes({ ...notes, [e.code]: ev.target.value })}
                />
                {notes[e.code] !== undefined && notes[e.code] !== (e.staffNote ?? "") && (
                  <ABtn onClick={() => update(e.code, { staffNote: notes[e.code] })}>Save note</ABtn>
                )}
              </div>
              <footer className="acard__foot">
                <span className="acard__ref">{e.code} · sent {sgDay(e.createdAt)}</span>
                <div className="achips achips--status" role="group" aria-label="Status">
                  {STATUSES.map((s) => (
                    <button key={s} type="button" disabled={action.isPending} className={`achip achip--${s.toLowerCase()} ${e.status === s ? "is-on" : ""}`} aria-pressed={e.status === s} onClick={() => e.status !== s && update(e.code, { status: s })}>{LABEL[s]}</button>
                  ))}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
