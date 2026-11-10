// NotFoundPage (WO-3) — minimal ledger-style dead end with a way home.
import { Link } from "react-router-dom";

export default function NotFoundPage(): JSX.Element {
  return (
    <div className="sh-notfound">
      <span className="mono-label">404</span>
      <h1 className="sh-notfound__title">Not found</h1>
      <p className="serif-prose sh-notfound__body">
        The page you asked for is not in this ledger.
      </p>
      <Link to="/" className="sh-notfound__link">
        Back to the portal
      </Link>
    </div>
  );
}
