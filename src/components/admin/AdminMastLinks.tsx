// AdminMastLinks — the department head's quick links, with the page you are
// on marked.
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Department review" },
  { to: "/faculty", label: "Faculty accounts" },
  { to: "/teaching", label: "My courses" },
];

export function AdminMastLinks(): JSX.Element {
  const location = useLocation();
  return (
    <>
      {LINKS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="adm-mast__link"
          aria-current={location.pathname === item.to ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
