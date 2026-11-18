import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiPost } from "../lib/api.js";
import { safeNext, useAuth } from "../lib/auth.jsx";
import { AuthLink, AuthShell, FormAlert, TextField } from "../components/auth/AuthShell";
import { Button, Arrow } from "../components/ui/ui";

export const meta = () => [
  { title: "Sign in | BrewGrillz Rewards Club" },
  { name: "description", content: "Sign in to your BrewGrillz account to earn and spend Rewards points." },
  { name: "robots", content: "noindex" },
];

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setUser(await apiPost("/auth/login", form));
      navigate(next, { replace: true });
    } catch (failure) {
      setError(failure.status ? failure.message : "We couldn’t reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome"
      accent="back."
      intro="Sign in to earn 1 point for every S$1 and use 100 points for S$5 off."
      footer={
        <>
          <p>New here? <AuthLink to={`/register?next=${encodeURIComponent(next)}`}>Join the Rewards Club</AuthLink></p>
          <p>Ordered as a guest? <AuthLink to="/track">Track your order</AuthLink></p>
        </>
      }
    >
      <form onSubmit={submit} className="auth__form" noValidate>
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField id="password" label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
        {error && <FormAlert>{error}</FormAlert>}
        <Button variant="primary" size="lg" type="submit" disabled={busy || !form.email || !form.password} icon={<Arrow />} className="auth__submit">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
