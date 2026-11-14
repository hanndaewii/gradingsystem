// Header (WO-3) — the ledger masthead: brand + mono small-caps role line,
// the primary nav (which marks the page you are on), the term switcher, the
// theme toggle, the profile button (the ONLY ProfileModal mount) and
// sign-out. Signed out, it degrades to brand + term + theme.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Select, useToast } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useTerm } from "../../context/TermContext";
import { useTheme } from "../../lib/useTheme";
import { termLabel } from "../../lib/format";
import { ProfileModal } from "../ProfileModal";

export function Header(): JSX.Element {
  const auth = useAuth();
  const { term, terms, setTerm } = useTerm();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const profile = auth.profile;

  // The places this role can go. The one you are on is marked, so the header
  // always says where you are.
  const navItems =
    profile?.role === "admin"
      ? [
          { to: "/", label: "Department review" },
          { to: "/faculty", label: "Faculty accounts" },
          { to: "/teaching", label: "My courses" },
        ]
      : [{ to: "/", label: "Courses" }];

  async function handleSignOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // Race the sign-out against a 5-second timeout so the spinner never
      // gets permanently stuck if Supabase is slow or unreachable.
      await Promise.race([
        auth.signOut(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("sign-out timed out")), 5000),
        ),
      ]);
    } catch {
      // Even on error/timeout we still clear local state and send the user to
      // the login page — the session cookie will be cleaned up on next load.
      toast.push({
        title: "Sign-out issue",
        description: "Session cleared locally. You have been signed out.",
        tone: "warn",
      });
    } finally {
      setSigningOut(false);
    }
    navigate("/login", { replace: true });
  }

  return (
    <header className="sh-header">
      <div className="sh-header__inner">
        <div className="sh-brandgroup">
          <Link to="/" className="sh-brand" aria-label="Faculty Grading Portal home">
            <img className="sh-brand__logo" src="/school-logo.png" alt="" width={30} height={30} />
            <span className="sh-brand__title">Faculty Grading Portal</span>
          </Link>
          <span className="sh-brand__role mono-label">
            {profile
              ? profile.role === "admin"
                ? "Department head"
                : "Professor"
              : "CWPC"}
          </span>
        </div>

        {profile ? (
          <nav className="sh-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="sh-nav__link"
                aria-current={location.pathname === item.to ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="sh-header__end">
          <Select
            aria-label="Grading term"
            title="Grading term"
            value={`${term.academicYear}|${term.semester}`}
            onChange={(e) => {
              const [academicYear, semester] = e.target.value.split("|");
              const match = terms.find(
                (t) => t.academicYear === academicYear && t.semester === Number(semester),
              );
              if (match) setTerm(match);
            }}
          >
            {terms.map((t) => (
              <option key={`${t.academicYear}|${t.semester}`} value={`${t.academicYear}|${t.semester}`}>
                {termLabel(t)}
              </option>
            ))}
          </Select>

          {/* ui Button does not forward aria-pressed, so the theme toggle is a
              native button reusing the ghost primitive's classes (no CSS is
              redefined). The glyph shows the mode you would switch to. */}
          <button
            type="button"
            className="ui-btn ui-btn--ghost sh-theme-toggle"
            aria-pressed={theme === "dim"}
            aria-label={theme === "dim" ? "Switch to light mode" : "Switch to dim mode"}
            title={theme === "dim" ? "Switch to light mode" : "Switch to dim mode"}
            onClick={toggle}
          >
            <span aria-hidden="true">{theme === "dim" ? "☀" : "☾"}</span>
          </button>

          {profile ? (
            <>
              <Button variant="ghost" title="Your profile" onClick={() => setProfileOpen(true)}>
                {profile.name}
              </Button>
              <Button
                variant="ghost"
                title="Sign out"
                loading={signingOut}
                disabled={signingOut}
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {profile ? <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} /> : null}
    </header>
  );
}
