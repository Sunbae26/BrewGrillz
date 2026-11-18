import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";
import { ADMIN_KEYS, isAdmin, isStaff } from "../../lib/admin.js";
import { Button } from "../../components/ui/ui";

/* DASHBOARD SHELL — staff only. Tabs with live badges; admin-only tabs hidden for staff. */

export const meta = () => [{ title: "Dashboard | BrewGrillz" }, { name: "robots", content: "noindex" }];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login", { replace: true });
  }, [loading, user, navigate]);

  const { data: summary } = useQuery({
    queryKey: ADMIN_KEYS.summary,
    queryFn: ({ signal }) => apiGet("/admin/summary", { signal }),
    enabled: isStaff(user),
    refetchInterval: 20_000,
  });

  if (loading || !user) return <section className="adm" aria-busy="true" />;

  if (!isStaff(user))
    return (
      <section className="adm adm--denied">
        <div className="container">
          <h1 className="display">Staff only</h1>
          <p>This dashboard is for the BrewGrillz team. Ask the owner to give your account access.</p>
          <Button to="/" variant="primary">Go to home page</Button>
        </div>
      </section>
    );

  const tabs = [
    ["/admin", "Orders", summary?.newOrders],
    ["/admin/bookings", "Bookings", summary?.bookingRequests],
    ["/admin/enquiries", "Events", summary?.newEnquiries],
    ["/admin/menu", "Menu"],
    ["/admin/rewards", "Rewards"],
    ["/admin/settings", "Settings"],
    ...(isAdmin(user) ? [["/admin/team", "Team"], ["/admin/reports", "Reports"]] : []),
  ];

  return (
    <section className="adm">
      <div className="adm__wrap">
        <header className="adm__bar">
          <div>
            <span className="eyebrow">BrewGrillz dashboard</span>
            <p className="adm__who">{user.name} · {user.isOwner ? "Owner" : user.role === "ADMIN" ? "Admin" : "Staff"}</p>
          </div>
          {summary?.ordersPaused && <span className="adm__paused">Online orders paused</span>}
          <a href="/" className="abtn abtn--ghost">View website</a>
          <button type="button" className="abtn abtn--ghost" onClick={async () => { await signOut(); navigate("/admin/login"); }}>Sign out</button>
        </header>
        <nav className="adm__tabs" aria-label="Dashboard">
          {tabs.map(([to, label, badge]) => (
            <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `adm__tab ${isActive ? "is-on" : ""}`}>
              {label}
              {badge > 0 && <b className="adm__badge">{badge}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="adm__body">
          <Outlet context={{ user }} />
        </div>
      </div>
    </section>
  );
}
