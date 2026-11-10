// AppShell (WO-3) — ledger chrome: sticky masthead + content column.
// Every route renders inside <main> via the Outlet (spec WO-3 step 4/5).
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function AppShell(): JSX.Element {
  return (
    <div className="sh-root">
      <Header />
      <main className="sh-main">
        <Outlet />
      </main>
    </div>
  );
}
