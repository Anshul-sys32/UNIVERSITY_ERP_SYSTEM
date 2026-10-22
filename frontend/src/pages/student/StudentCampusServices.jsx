import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/roleApi";
import { getStudentUserId } from "../../api/studentApi";

const StudentCampusServices = ({ section = "hostel" }) => {
  const userId = getStudentUserId();
  const [hostel, setHostel] = useState(null);
  const [projects, setProjects] = useState([]);
  const [hostelForm, setHostelForm] = useState({ academicYear: "", preferredBuildingId: "", reason: "" });
  const [maintenance, setMaintenance] = useState({ category: "", description: "" });
  const [statements, setStatements] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (section === "hostel") return apiRequest(`/campus-student/${userId}/hostel`).then(setHostel);
    return apiRequest(`/campus-student/${userId}/research`).then(setProjects);
  }, [section, userId]);

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, [load]);

  const submit = async (path, body, successMessage) => {
    setError(""); setMessage("");
    try {
      const response = await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(response.message || successMessage);
      await load();
      return true;
    } catch (requestError) { setError(requestError.message); return false; }
  };

  const applyForHostel = async (event) => {
    event.preventDefault();
    if (await submit(`/campus-student/${userId}/hostel/applications`, hostelForm)) setHostelForm({ academicYear: "", preferredBuildingId: "", reason: "" });
  };

  const requestMaintenance = async (event) => {
    event.preventDefault();
    if (await submit(`/campus-student/${userId}/hostel/maintenance`, maintenance)) setMaintenance({ category: "", description: "" });
  };

  const applyToProject = (project) => submit(`/campus-student/${userId}/research/${project.PROJECT_ID}/apply`, { statement: statements[project.PROJECT_ID] || "" });

  return (
    <main className="min-h-screen space-y-8 p-5 text-white erp-gradient sm:p-8">
      <header><p className="text-xs uppercase text-white/55">Campus services</p><h1 className="mt-2 text-3xl font-bold">{section === "hostel" ? "Hostel services" : "Research & development"}</h1><p className="mt-2 text-sm text-white/65">Applications and requests are handled through review workflows.</p></header>
      {message && <p className="rounded bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="rounded bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      {loading ? <p className="text-white/70">Loading your campus services…</p> : <>
        {section === "hostel" && <section className="space-y-4"><h2 className="text-xl font-semibold">Hostel</h2>
          {hostel?.allocations?.map((allocation) => <p className="erp-panel p-4 text-sm" key={allocation.ALLOCATION_ID}>Allocation: {allocation.BUILDING_NAME} · Room {allocation.ROOM_NUMBER} · Bed {allocation.BED_NUMBER} · {allocation.STATUS}</p>)}
          <form className="erp-panel grid gap-3 p-5 md:grid-cols-3" onSubmit={applyForHostel}><h3 className="font-semibold md:col-span-3">Hostel application</h3><input className="erp-input" placeholder="Academic year (2026-2027)" required value={hostelForm.academicYear} onChange={(event) => setHostelForm({ ...hostelForm, academicYear: event.target.value })} /><select className="erp-input" value={hostelForm.preferredBuildingId} onChange={(event) => setHostelForm({ ...hostelForm, preferredBuildingId: event.target.value })}><option value="">Any building</option>{hostel?.buildings?.map((building) => <option key={building.BUILDING_ID} value={building.BUILDING_ID}>{building.NAME}</option>)}</select><input className="erp-input" placeholder="Reason (optional)" value={hostelForm.reason} onChange={(event) => setHostelForm({ ...hostelForm, reason: event.target.value })} /><button className="erp-button md:col-span-3 md:w-fit" type="submit">Submit application</button></form>
          <div className="divide-y divide-white/15 border-y border-white/15">{hostel?.applications?.map((application) => <p className="py-3 text-sm" key={application.APPLICATION_ID}>{application.ACADEMIC_YEAR} · {application.STATUS}</p>)}</div>
          {hostel?.allocations?.some((allocation) => allocation.STATUS === "ACTIVE") && <form className="erp-panel grid gap-3 p-5 md:grid-cols-3" onSubmit={requestMaintenance}><h3 className="font-semibold md:col-span-3">Maintenance request</h3><input className="erp-input" placeholder="Category" required value={maintenance.category} onChange={(event) => setMaintenance({ ...maintenance, category: event.target.value })} /><textarea className="erp-input md:col-span-2" placeholder="Describe the issue" required value={maintenance.description} onChange={(event) => setMaintenance({ ...maintenance, description: event.target.value })} /><button className="erp-button md:w-fit" type="submit">Submit request</button></form>}
          <div className="divide-y divide-white/15 border-y border-white/15">{hostel?.maintenance?.map((item) => <p className="py-3 text-sm" key={item.REQUEST_ID}>{item.CATEGORY} · {item.STATUS} · {item.DESCRIPTION}</p>)}</div>
        </section>}
        {section === "research" && <section className="space-y-4"><h2 className="text-xl font-semibold">Research opportunities</h2><div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <article className="erp-panel space-y-3 p-5" key={project.PROJECT_ID}><div><h3 className="font-semibold">{project.TITLE}</h3><p className="text-xs text-white/55">Supervisor: {project.SUPERVISOR || "To be assigned"} · Deadline {project.APPLICATION_DEADLINE}</p></div><p className="text-sm text-white/70">{project.DESCRIPTION}</p>{project.APPLICATION_STATUS ? <p className="text-sm text-lime-100">Application: {project.APPLICATION_STATUS}</p> : <><textarea aria-label={`Application statement for ${project.TITLE}`} className="erp-input min-h-24" placeholder="Why are you interested? Include relevant experience and interests." value={statements[project.PROJECT_ID] || ""} onChange={(event) => setStatements({ ...statements, [project.PROJECT_ID]: event.target.value })} /><button className="erp-button px-3 py-2 text-sm" onClick={() => applyToProject(project)} type="button">Apply</button></>}</article>)}</div>{!projects.length && <p className="text-sm text-white/60">No open research opportunities.</p>}</section>}
      </>}
    </main>
  );
};

export default StudentCampusServices;