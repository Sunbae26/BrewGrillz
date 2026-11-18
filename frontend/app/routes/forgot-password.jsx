import { useState } from "react";
import { apiPost } from "../lib/api.js";
import { AuthLink, AuthShell, FormAlert, TextField } from "../components/auth/AuthShell";
import { Button, Arrow } from "../components/ui/ui";

export const meta = () => [{ title: "Forgot password | BrewGrillz" }, { name: "robots", content: "noindex" }];

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/auth/forgot-password", { email });
      setSent(true);
    } catch (failure) {
      setError(failure.message);
    }
    setBusy(false);
  };

  return (
    <AuthShell eyebrow="Account" title="Forgot your" accent="password?" intro="Enter your email and we’ll send you a link to choose a new one." aside={false} footer={<p>Remembered it? <AuthLink to="/login">Sign in</AuthLink></p>}>
      {sent ? (
        <FormAlert tone="info">If there’s an account for {email}, we’ve sent a reset link. It works for 1 hour. Check your spam folder too.</FormAlert>
      ) : (
        <form onSubmit={submit} className="auth__form" noValidate>
          <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <FormAlert>{error}</FormAlert>}
          <Button variant="primary" size="lg" type="submit" disabled={busy || !email} icon={<Arrow />} className="auth__submit">{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
