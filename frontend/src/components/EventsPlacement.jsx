import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate } from "../api/studentApi";
import { apiRequest } from "../api/roleApi";
import { getStudentUserId } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const EventsPlacement = () => {
  const [events, setEvents] = useState([]);
  const [drives, setDrives] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => Promise.all([
    fetchStudentResource("events"),
    fetchStudentResource("placements"),
  ]).then(([eventRows, driveRows]) => {
    setEvents(eventRows);
    setDrives(driveRows);
  });

  useEffect(() => {
    load()
      .catch((loadError) => setState({ loading: false, error: loadError.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const apply = async (drive) => {
    setError(""); setMessage("");
    try {
      const response = await apiRequest(`/student-data/${getStudentUserId()}/placements/${drive.DRIVE_ID}/apply`, { method: "POST", body: JSON.stringify({}) });
      setMessage(response.message);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  const withdraw = async (drive) => {
    setError(""); setMessage("");
    try {
      const response = await apiRequest(`/student-data/${getStudentUserId()}/placements/applications/${drive.APPLICATION_ID}/withdraw`, { method: "POST", body: JSON.stringify({}) });
      setMessage(response.message);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Events & placement</h2>
      <p className="mb-6 text-sm text-white/70">Discover what is happening across campus.</p>
      {message && <p className="mb-4 rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <StudentDataState {...state} empty={!events.length && !drives.length}>
        <section className="mb-8">
          <h3 className="mb-3 text-xl font-semibold text-white">Placement drives</h3>
          <div className="grid gap-4 md:grid-cols-2">{drives.map((drive) => <article className="erp-panel space-y-3 p-5 text-white" key={drive.DRIVE_ID}><div className="flex justify-between gap-3"><h4 className="font-semibold">{drive.COMPANY_NAME} · {drive.ROLE_TITLE}</h4><span className="text-xs text-white/60">{drive.PACKAGE || "Package not listed"}</span></div><p className="text-sm text-white/70">{drive.ELIGIBILITY || "See placement office for eligibility"}</p><p className="text-xs text-white/55">Drive {formatDate(drive.DRIVE_DATE)} · Apply by {formatDate(drive.APPLICATION_DEADLINE)}</p><div className="flex items-center justify-between"><span className="text-sm text-white/70">{drive.APPLICATION_STATUS || "Not applied"}</span>{drive.APPLICATION_STATUS === "APPLIED" ? <button className="rounded border border-white/30 px-3 py-2 text-xs" onClick={() => withdraw(drive)} type="button">Withdraw</button> : drive.APPLICATION_STATUS === "WITHDRAWN" ? <button className="erp-button px-3 py-2 text-xs" onClick={() => apply(drive)} type="button">Reapply</button> : !drive.APPLICATION_STATUS && <button className="erp-button px-3 py-2 text-xs" onClick={() => apply(drive)} type="button">Apply</button>}</div></article>)}</div>
          {!drives.length && <p className="text-sm text-white/60">No open placement drives currently match your active course enrollment.</p>}
        </section>
        <section>
          <h3 className="mb-3 text-xl font-semibold text-white">Campus events</h3>
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((event) => (
            <article className="erp-panel p-5 text-white" key={event.EVENT_ID}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">{event.TITLE}</h3>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs">{event.TYPE}</span>
              </div>
              <p className="mt-4 text-sm text-white/75">{formatDate(event.EVENT_DATE)} · {event.LOCATION || "Campus"}</p>
              {event.DESCRIPTION && <p className="mt-3 text-sm leading-6 text-white/65">{event.DESCRIPTION}</p>}
            </article>
          ))}
        </div>
        </section>
      </StudentDataState>
    </section>
  );
};

export default EventsPlacement;
