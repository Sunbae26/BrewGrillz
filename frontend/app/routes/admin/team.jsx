import { useState } from "react";
import { useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, fieldError } from "../../lib/api.js";
import { ADMIN_KEYS, isAdmin, useAdminAction } from "../../lib/admin.js";
import { ABtn, AdminOnly, ErrorNote, Loading, PageHead, TwoTap, sgDay } from "../../components/admin/Admin";
import { TextField } from "../../components/auth/AuthShell";

/* TEAM — admins add staff; only the owner adds or changes admins. */

const ROLE = { ADMIN: "Admin", STAFF: "Staff" };
const EMPTY = { name: "", email: "", password: "", role: "STAFF" };

export default function AdminTeam() {
  const { user } = useOutletContext();
  if (!isAdmin(user)) return <AdminOnly title="Team" />;
  return <Team user={user} />;
}

function Team({ user }) {
  const team = useQuery({ queryKey: ADMIN_KEYS.team, queryFn: ({ signal }) => apiGet("/admin/team", { signal }) });
  const action = useAdminAction([ADMIN_KEYS.team]);
  const [form, setForm] = useState(EMPTY);
  const [added, setAdded] = useState(null);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const customerExists = (action.error?.code ?? action.error?.details?.code) === "CUSTOMER_EXISTS";

  const add = (e, confirmExisting = false) => {
    e?.preventDefault();
    setAdded(null);
    action.mutate(
      { path: "/admin/team", body: { ...form, ...(confirmExisting ? { confirmExisting: true } : {}) } },
      { onSuccess: (member) => { setAdded(member); setForm(EMPTY); } },
    );
  };

  const changeRole = (email, role) => action.mutate({ method: "PATCH", path: `/admin/team/${encodeURIComponent(email)}`, body: { role } });

  return (
    <>
      <PageHead title="Team" />
      {team.isLoading ? <Loading /> : team.isError ? <ErrorNote error={team.error} /> : (
        <div className="adm__list">
          {team.data.map((m) => {
            const canEdit = m.email !== user.email && !m.isOwner && (user.isOwner || m.role === "STAFF");
            return (
              <article key={m.email} className="acard acard--compact">
                <header className="acard__head">
                  <b className="acard__code">{m.name}</b>
                  <span className="acard__time">{m.email}</span>
                  <span className={`olist__status olist__status--${m.isOwner ? "ready" : m.role === "ADMIN" ? "preparing" : "placed"}`}>{m.isOwner ? "Owner" : ROLE[m.role]}</span>
                </header>
                <footer className="acard__foot">
                  <span className="acard__ref">Since {sgDay(m.createdAt)}{m.email === user.email ? " · you" : ""}</span>
                  {canEdit && (
                    <div className="acard__actions">
                      {user.isOwner && m.role === "STAFF" && <ABtn onClick={() => changeRole(m.email, "ADMIN")}>Make admin</ABtn>}
                      {user.isOwner && m.role === "ADMIN" && <ABtn onClick={() => changeRole(m.email, "STAFF")}>Make staff</ABtn>}
                      <TwoTap label="Remove access" confirmLabel="Remove access?" onConfirm={() => changeRole(m.email, "CUSTOMER")} />
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <section className="aset">
        <h3 className="adm__sub">Add a team member</h3>
        <p className="adm__hint">They’ll get an email with a link to sign in at /admin/login. Share the password with them in person, and they can change it with “Forgot your password?”.</p>
        <form className="ateam" onSubmit={add} noValidate>
          <TextField id="tname" label="Name" value={form.name} onChange={set("name")} error={fieldError(action.error, "name")} />
          <TextField id="temail" label="Email" type="email" value={form.email} onChange={set("email")} error={fieldError(action.error, "email")} />
          <TextField id="tpass" label="Starting password" type="text" autoComplete="off" value={form.password} onChange={set("password")} error={fieldError(action.error, "password")} hint="8+ characters with a letter and a number" />
          <div className="field">
            <span>Access</span>
            <div className="arole" role="radiogroup" aria-label="Access">
              {[["STAFF", "Staff", "Orders, bookings, sold-out, Rewards"], ...(user.isOwner ? [["ADMIN", "Admin", "Also prices, refunds, team, reports"]] : [])].map(([value, label, text]) => (
                <button key={value} type="button" role="radio" aria-checked={form.role === value} className={`arole__opt ${form.role === value ? "is-on" : ""}`} onClick={() => setForm({ ...form, role: value })}>
                  <b>{label}</b>
                  <small>{text}</small>
                </button>
              ))}
            </div>
          </div>
          {action.error && !action.error.details?.length && !customerExists && <ErrorNote error={action.error} />}
          {customerExists && (
            <p className="falert falert--info" role="status">
              {action.error.message} <button type="button" className="auth__link" onClick={() => add(null, true)}>Yes, give them access</button>
            </p>
          )}
          {added && <p className="falert falert--info" role="status">{added.name} can now sign in as {ROLE[added.role]}.</p>}
          <ABtn tone="primary" type="submit" disabled={action.isPending || !form.name || !form.email || !form.password}>Add to team</ABtn>
        </form>
      </section>
    </>
  );
}
