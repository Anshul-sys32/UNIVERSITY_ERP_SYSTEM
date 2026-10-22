import { useCallback, useEffect, useState } from "react";
import { employeeRequest } from "../../api/roleApi";

const emptyDrive = {
  companyName: "",
  roleTitle: "",
  eligibility: "",
  driveDate: "",
  applicationDeadline: "",
  location: "",
  package: "",
  description: "",
};

const PlacementManagement = () => {
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyDrive);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [driveData, applicationData] = await Promise.all([
      employeeRequest("/placements"),
      employeeRequest("/placements/applications"),
    ]);
    setDrives(driveData);
    setApplications(applicationData);
  }, []);

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [load]);

  const createDrive = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await employeeRequest("/placements", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setForm(emptyDrive);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateDrive = async (driveId, status) => {
    try {
      const result = await employeeRequest(`/placements/${driveId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateApplication = async (applicationId, status) => {
    try {
      const result = await employeeRequest(`/placements/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(result.message);
      setApplications((current) => current.map((item) => (
        item.APPLICATION_ID === applicationId ? { ...item, STATUS: status } : item
      )));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Employee operations</p>
          <h1 className="mt-2 text-3xl font-bold">Placement department</h1>
          <p className="mt-2 text-white/70">Coordinate employers, campus drives, and student applications.</p>
        </header>

        <form className="erp-panel grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3" onSubmit={createDrive}>
          <input className="erp-input" placeholder="Company name" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} required />
          <input className="erp-input" placeholder="Job role" value={form.roleTitle} onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} required />
          <input className="erp-input" placeholder="Eligibility (e.g. CGPA 7+)" value={form.eligibility} onChange={(event) => setForm({ ...form, eligibility: event.target.value })} />
          <label className="text-sm text-white/70">Drive date<input className="erp-input mt-2" type="date" value={form.driveDate} onChange={(event) => setForm({ ...form, driveDate: event.target.value })} required /></label>
          <label className="text-sm text-white/70">Application deadline<input className="erp-input mt-2" type="date" value={form.applicationDeadline} onChange={(event) => setForm({ ...form, applicationDeadline: event.target.value })} required /></label>
          <input className="erp-input" placeholder="Location or meeting link" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <input className="erp-input" placeholder="Package (e.g. 8 LPA)" value={form.package} onChange={(event) => setForm({ ...form, package: event.target.value })} />
          <textarea className="erp-input min-h-24 lg:col-span-2" placeholder="Drive description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <button className="erp-button lg:col-span-3 lg:w-fit" type="submit">Create placement drive</button>
        </form>

        {message && <p className="mt-4 rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="erp-panel p-6">
            <h2 className="text-xl font-semibold">Placement drives</h2>
            <div className="mt-5 space-y-4">
              {drives.length ? drives.map((drive) => (
                <article className="border-b border-white/15 pb-4 last:border-0" key={drive.DRIVE_ID}>
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">{drive.COMPANY_NAME} · {drive.ROLE_TITLE}</h3><p className="mt-1 text-sm text-white/60">{drive.ELIGIBILITY || "Eligibility to be announced"} · {drive.PACKAGE || "Package not listed"}</p></div>
                    <select className="rounded-lg bg-white px-2 py-1 text-xs text-slate-900" value={drive.STATUS} onChange={(event) => updateDrive(drive.DRIVE_ID, event.target.value)}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="COMPLETED">Completed</option></select>
                  </div>
                  <p className="mt-2 text-sm text-white/70">Drive: {drive.DRIVE_DATE} · Deadline: {drive.APPLICATION_DEADLINE} · Applications: {drive.APPLICATION_COUNT}</p>
                </article>
              )) : <p className="text-sm text-white/60">No placement drives created.</p>}
            </div>
          </div>
          <div className="erp-panel p-6">
            <h2 className="text-xl font-semibold">Student applications</h2>
            <div className="mt-5 space-y-4">
              {applications.length ? applications.map((application) => (
                <article className="border-b border-white/15 pb-4 last:border-0" key={application.APPLICATION_ID}>
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{application.FIRST_NAME} {application.LAST_NAME || ""}</h3><p className="text-sm text-white/60">{application.ROLL_NUMBER || "No roll number"} · {application.COMPANY_NAME} · {application.ROLE_TITLE}</p></div><select className="rounded-lg bg-white px-2 py-1 text-xs text-slate-900" value={application.STATUS} onChange={(event) => updateApplication(application.APPLICATION_ID, event.target.value)}><option value="APPLIED">Applied</option><option value="SHORTLISTED">Shortlisted</option><option value="SELECTED">Selected</option><option value="REJECTED">Rejected</option><option value="WITHDRAWN">Withdrawn</option></select></div>
                </article>
              )) : <p className="text-sm text-white/60">No student applications yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlacementManagement;
