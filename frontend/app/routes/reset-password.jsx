import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiPost, fieldError } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { isStaff } from "../lib/admin.js";
import { AuthLink, AuthShell, FormAlert, TextField } from "../components/auth/AuthShell";
import { Button, Arrow } from "../components/ui/ui";

export const meta = () => [{ title: "Choose a new password | BrewGrillz" }, { name: "robots", content: "noindex" }];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const user = await apiPost("/auth/reset-password", { token, password });
      setUser(user);
      navigate(isStaff(user) ? "/admin" : "/account", { replace: true });
    } catch (error) {
      setFailure(error);
      setBusy(false);
    }
  };

  return (
    <AuthShell eyebrow="Account" title="New" accent="password." intro="Choose a new password. You’ll be signed out everywhere else." aside={false} footer={<p><AuthLink to="/forgot-password">Need a new link?</AuthLink></p>}>
      {!token ? (
        <FormAlert>This link is missing its code. Open the link from your email again, or ask for a new one.</FormAlert>
      ) : (
        <form onSubmit={submit} className="auth__form" noValidate>
          <TextField id="password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." error={fieldError(failure, "password")} />
          {failure && !fieldError(failure, "password") && <FormAlert>{failure.message}</FormAlert>}
          <Button variant="primary" size="lg" type="submit" disabled={busy || password.length < 8} icon={<Arrow />} className="auth__submit">{busy ? "Saving…" : "Save and sign in"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
