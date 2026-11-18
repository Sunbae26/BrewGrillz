import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiPost, fieldError } from "../lib/api.js";
import { safeNext, useAuth } from "../lib/auth.jsx";
import { AuthLink, AuthShell, FormAlert, TextField } from "../components/auth/AuthShell";
import { Button, Arrow } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";
import { seo } from "../lib/seo.js";

export const meta = () =>
  seo({
    title: "Join the Rewards Club | BrewGrillz Singapore",
    description: "Create a free BrewGrillz account: earn points on pickup orders and dine-in bills, and get money off.",
    path: "/register",
    noIndex: true,
  });

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [whatsapp, setWhatsapp] = useState(false);
  const [agree, setAgree] = useState(false);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!agree) return setFailure({ message: "Please accept the terms and privacy policy to join." });
    setBusy(true);
    setFailure(null);
    try {
      setUser(await apiPost("/auth/register", { ...form, phone: form.phone.trim() || undefined, whatsapp: whatsapp && Boolean(form.phone.trim()) }));
      navigate(next, { replace: true });
    } catch (error) {
      setFailure(error.status ? error : { message: "We couldn’t reach the server. Check your connection and try again." });
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Join the"
      accent="club."
      intro="Free to join. Earn points on every pickup order and dine-in bill, and spend them for money off."
      footer={<p>Already a member? <AuthLink to={`/login?next=${encodeURIComponent(next)}`}>Sign in</AuthLink></p>}
    >
      <form onSubmit={submit} className="auth__form" noValidate>
        <TextField id="name" label="Name" autoComplete="name" required maxLength={80} value={form.name} onChange={set("name")} error={fieldError(failure, "name")} />
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={fieldError(failure, "email")} />
        <TextField id="phone" label="Mobile (optional)" autoComplete="tel" inputMode="tel" placeholder="9123 4567" value={form.phone} onChange={set("phone")} hint="So our team can find you when you pay for a dine-in bill." error={fieldError(failure, "phone")} />
        <TextField id="password" label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set("password")} hint="At least 8 characters." error={fieldError(failure, "password")} />
        {form.phone.trim() && (
          <label className="csum__agree cbox__opt">
            <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
            <span>Send my order and booking updates on WhatsApp</span>
          </label>
        )}
        <label className="csum__agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I agree to the <MoCoLink to="/terms">terms</MoCoLink> and <MoCoLink to="/privacy">privacy policy</MoCoLink>.</span>
        </label>
        {failure && !fieldError(failure, "password") && <FormAlert>{failure.message}</FormAlert>}
        <Button variant="primary" size="lg" type="submit" disabled={busy} icon={<Arrow />} className="auth__submit">
          {busy ? "Creating your account…" : "Create my account"}
        </Button>
      </form>
    </AuthShell>
  );
}
