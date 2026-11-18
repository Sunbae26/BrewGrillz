import { useState } from "react";
import { useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { isAdmin, useAdminAction } from "../../lib/admin.js";
import { ABtn, Empty, ErrorNote, Loading, PageHead } from "../../components/admin/Admin";

/* REWARDS — find a member by name, email or mobile and add points for a dine-in bill. */

export default function AdminRewards() {
  const { user } = useOutletContext();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const members = useQuery({
    queryKey: ["admin", "members", q],
    queryFn: ({ signal }) => apiGet(`/admin/members?q=${encodeURIComponent(q)}`, { signal }),
    enabled: q.length >= 2,
  });

  return (
    <>
      <PageHead title="Rewards" />
      <form className="adm__search" onSubmit={(e) => { e.preventDefault(); setQ(term.trim()); setOpen(null); }}>
        <input className="adm__input" type="search" placeholder="Member’s name, email or mobile" value={term} onChange={(e) => setTerm(e.target.value)} />
        <ABtn tone="primary" type="submit" disabled={term.trim().length < 2}>Find member</ABtn>
      </form>
      <p className="adm__hint">Dine-in: enter the bill total (before points) and the system adds 1 point per S$1. {isAdmin(user) ? "As an admin you can also correct points directly." : ""}</p>

      {q.length < 2 ? null : members.isLoading ? <Loading /> : members.isError ? <ErrorNote error={members.error} /> : members.data.length === 0 ? (
        <Empty>No member found. Ask them to join at brewgrillz.sg/register, then search again.</Empty>
      ) : (
        <div className="adm__list">
          {members.data.map((m) => (
            <article key={m.id} className="acard">
              <header className="acard__head">
                <b className="acard__code">{m.name}</b>
                <span className="acard__time">{m.email}{m.phone ? ` · ${m.phone}` : ""}</span>
                <b className="acard__pts">{m.balance} pts</b>
              </header>
              {open === m.id ? <AddPoints member={m} admin={isAdmin(user)} q={q} onDone={() => setOpen(null)} /> : (
                <footer className="acard__foot">
                  <span />
                  <ABtn tone="primary" onClick={() => setOpen(m.id)}>Add points</ABtn>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AddPoints({ member, admin, q, onDone }) {
  const [mode, setMode] = useState("bill");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const action = useAdminAction([["admin", "members", q]]);

  const submit = (e) => {
    e.preventDefault();
    const body = mode === "bill" ? { billCents: Math.round(Number(value) * 100) } : { points: Math.trunc(Number(value)) };
    if (note.trim()) body.note = note.trim();
    action.mutate({ path: `/admin/members/${member.id}/points`, body }, { onSuccess: (data) => { setResult(data); setValue(""); setNote(""); } });
  };

  return (
    <form className="apoints" onSubmit={submit}>
      {admin && (
        <div className="apoints__mode">
          <label><input type="radio" checked={mode === "bill"} onChange={() => setMode("bill")} /> Dine-in bill</label>
          <label><input type="radio" checked={mode === "points"} onChange={() => setMode("points")} /> Correct points</label>
        </div>
      )}
      <div className="apoints__row">
        <input className="adm__input" inputMode="decimal" required placeholder={mode === "bill" ? "Bill total, e.g. 86.40" : "Points, e.g. 20 or -20"} value={value} onChange={(e) => setValue(e.target.value)} />
        <input className="adm__input" placeholder="Note (optional), e.g. table 7" value={note} onChange={(e) => setNote(e.target.value)} />
        <ABtn tone="primary" type="submit" disabled={action.isPending || !value}>{mode === "bill" ? "Add points" : "Save"}</ABtn>
        <ABtn onClick={onDone}>Close</ABtn>
      </div>
      <ErrorNote error={action.error} />
      {result && <p className="falert falert--info" role="status">Added {result.added} points. New balance: {result.balance}.</p>}
    </form>
  );
}
