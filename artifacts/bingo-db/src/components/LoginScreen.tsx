import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import appIcon from "@assets/icon-512_1775010520611.png";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    const ok = await onLogin(password);

    if (!ok) {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <img src={appIcon} alt="Road Trip Bingo" className="w-14 h-14 rounded-xl" />
            <div className="text-center">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                Road Trip Bingo
              </h1>
              <p className="text-sm text-muted-foreground">Data Cockpit</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Admin password"
                autoFocus
                autoComplete="current-password"
                disabled={loading}
                className={[
                  "w-full pl-9 pr-3 py-2 rounded-lg border text-sm bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                  "disabled:opacity-50",
                  error
                    ? "border-destructive text-destructive"
                    : "border-border text-foreground",
                ].join(" ")}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className={[
                "w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
