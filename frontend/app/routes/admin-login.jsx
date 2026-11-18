import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, fieldError } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { isStaff } from "../lib/admin.js";
import { AuthLink, AuthShell, FormAlert, TextField } from "../components/auth/AuthShell";
import { Button, Arrow } from "../components/ui/ui";

/* STAFF SIGN IN — the very first visit creates the owner account (once). After that it's a normal sign-in. */

export const meta = () => [{ title: "Staff sign in | BrewGrillz" }, { name: "robots", content: "noindex" }];

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const setup = useQuery({ queryKey: ["auth", "setup"], queryFn: ({ signal }) => apiGet("/auth/setup", { signal }), retry: false });

  useEffect(() => {
    if (isStaff(user)) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const done = (signedIn) => {
    setUser(signedIn);
    navigate(isStaff(signedIn) ? "/admin" : "/account", { replace: true });
  };

  const needsSetup = setup.data?.needsSetup;

  return (
    <AuthShell
      eyebrow="Team only"
      title={needsSetup ? "Set up the" : "Staff"}
      accent={needsSetup ? "owner." : "sign in."}
      intro={needsSetup ? "Create the owner account. This form only works once." : "Orders, bookings, menu and Rewards, all in one dashboard."}
      aside={false}
      footer={<p>Not on the team? <AuthLink to="/login">Customer sign in</AuthLink></p>}
    >
      {setup.isPending ? null : needsSetup ? (
        <OwnerSetup keyRequired={setup.data.setupKeyRequired} onDone={done} />
      ) : (
        <StaffSignIn onDone={done} />
      )}
    </AuthShell>
  );
}

function OwnerSetup({ keyRequired, onDone }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", setupKey: "" });
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const { setupKey, ...rest } = form;
      onDone(await apiPost("/auth/setup", keyRequired ? form : rest));
    } catch (error) {
      setFailure(error);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth__form" noValidate>
      <FormAlert tone="info">No owner account exists yet. The account you create here gets full access, then this form disappears.</FormAlert>
      <TextField id="name" label="Your name" autoComplete="name" required value={form.name} onChange={set("name")} error={fieldError(failure, "name")} />
      <TextField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={fieldError(failure, "email")} />
      <TextField
        id="password" label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set("password")}
        error={fieldError(failure, "password")} hint="At least 8 characters with a letter and a number. Make it strong: this account runs the restaurant."
      />
      {keyRequired && (
        <TextField id="setupKey" label="Setup key" type="password" required value={form.setupKey} onChange={set("setupKey")} hint="The ADMIN_SETUP_KEY from the backend settings." />
      )}
      {failure && !failure.details && <FormAlert>{failure.message}</FormAlert>}
      <Button variant="primary" size="lg" type="submit" disabled={busy} icon={<Arrow />} className="auth__submit">
        {busy ? "Creating…" : "Create owner account"}
      </Button>
    </form>
  );
}

function StaffSignIn({ onDone }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await apiPost("/auth/login", form));
    } catch (failure) {
      setError(failure.status ? failure.message : "We couldn’t reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth__form" noValidate>
      <TextField id="email" label="Work email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextField id="password" label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
      {error && <FormAlert>{error}</FormAlert>}
      <Button variant="primary" size="lg" type="submit" disabled={busy || !form.email || !form.password} icon={<Arrow />} className="auth__submit">
        {busy ? "Signing in…" : "Open dashboard"}
      </Button>
    </form>
  );
}
