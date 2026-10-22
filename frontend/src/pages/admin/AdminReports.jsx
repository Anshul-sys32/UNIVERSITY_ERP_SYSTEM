import { useEffect, useState } from "react";
import { adminRequest, getCurrentUser } from "../../api/roleApi";
import { formatMoney } from "../../api/studentApi";

const AdminReports = () => {
  const userId = getCurrentUser()?.user_id;
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { adminRequest(`/reports/${userId}/overview`).then(setReport).catch((requestError) => setError(requestError.message)); }, [userId]);

  const cards = report ? [
    ["Active students", report.students],
    ["Active faculty", report.faculty],
    ["Active courses", report.courses],
    ["Open placement drives", report.openPlacementDrives],
    ["Fees billed", formatMoney(report.fees.billed)],
    ["Fees outstanding", formatMoney(report.fees.outstanding)],
    ["Unread notifications", report.unreadNotifications],
  ] : [];

  return <main className="min-h-screen p-5 text-white erp-gradient sm:p-8"><div className="mx-auto max-w-6xl"><header><p className="text-xs uppercase text-white/55">Aggregate reporting</p><h1 className="mt-2 text-3xl font-bold">University overview</h1><p className="mt-2 text-sm text-white/65">Counts and totals only; no student-level records are included.</p></header>{error && <p className="mt-5 rounded bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <article className="erp-panel p-5" key={label}><p className="text-sm text-white/60">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></article>)}</div></div></main>;
};

export default AdminReports;