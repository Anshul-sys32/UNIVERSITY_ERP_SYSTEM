import { useCallback, useEffect, useState } from "react";
import { apiRequest, getCurrentUser } from "../api/roleApi";

const CampusAdministration = () => {
  const userId = getCurrentUser()?.user_id;
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hostelApplications, setHostelApplications] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [researchApplications, setResearchApplications] = useState([]);
  const [buildingName, setBuildingName] = useState("");
  const [roomForms, setRoomForms] = useState({});
  const [allocations, setAllocations] = useState({});
  const [project, setProject] = useState({ title: "", description: "", supervisor: "", programId: "", applicationDeadline: "", capacity: 1 });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => Promise.all([
    apiRequest(`/campus-admin/${userId}/hostel/buildings`),
    apiRequest(`/campus-admin/${userId}/hostel/rooms`),
    apiRequest(`/campus-admin/${userId}/hostel/applications`),
    apiRequest(`/campus-admin/${userId}/hostel/maintenance`),
    apiRequest(`/campus-admin/${userId}/research/applications`),
  ]).then(([buildingRows, roomRows, appRows, maintenanceRows, researchRows]) => {
    setBuildings(buildingRows); setRooms(roomRows); setHostelApplications(appRows); setMaintenance(maintenanceRows); setResearchApplications(researchRows);
  }), [userId]);

  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);

  const send = async (path, method, body) => {
    setError(""); setMessage("");
    try { const response = await apiRequest(`/campus-admin/${userId}${path}`, { method, body: JSON.stringify(body) }); setMessage(response.message); await load(); }
    catch (requestError) { setError(requestError.message); }
  };

  const addBuilding = (event) => { event.preventDefault(); send("/hostel/buildings", "POST", { name: buildingName }).then(() => setBuildingName("")); };
  const addRoom = (event, buildingId) => { event.preventDefault(); const form = roomForms[buildingId] || {}; send(`/hostel/buildings/${buildingId}/rooms`, "POST", form).then(() => setRoomForms({ ...roomForms, [buildingId]: { roomNumber: "", capacity: "" } })); };
  const createProject = (event) => { event.preventDefault(); send("/research/projects", "POST", project).then(() => setProject({ title: "", description: "", supervisor: "", programId: "", applicationDeadline: "", capacity: 1 })); };

  return <main className="min-h-screen space-y-8 p-5 text-white erp-gradient sm:p-8"><div className="mx-auto max-w-6xl"><header><p className="text-xs uppercase text-white/55">Campus operations</p><h1 className="mt-2 text-3xl font-bold">Hostel & research administration</h1></header>{message && <p className="mt-5 rounded bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="mt-5 rounded bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
    <section className="mt-8 space-y-4"><h2 className="text-xl font-semibold">Hostel inventory</h2><form className="flex gap-3" onSubmit={addBuilding}><input className="erp-input max-w-sm" placeholder="Building name" required value={buildingName} onChange={(event) => setBuildingName(event.target.value)} /><button className="erp-button" type="submit">Add building</button></form>{buildings.map((building) => <article className="erp-panel grid gap-3 p-4 md:grid-cols-4" key={building.BUILDING_ID}><div className="font-semibold">{building.NAME} · {building.ROOM_COUNT} rooms</div><input className="erp-input" placeholder="Room number" value={roomForms[building.BUILDING_ID]?.roomNumber || ""} onChange={(event) => setRoomForms({ ...roomForms, [building.BUILDING_ID]: { ...roomForms[building.BUILDING_ID], roomNumber: event.target.value } })} /><input className="erp-input" type="number" min="1" max="20" placeholder="Capacity" value={roomForms[building.BUILDING_ID]?.capacity || ""} onChange={(event) => setRoomForms({ ...roomForms, [building.BUILDING_ID]: { ...roomForms[building.BUILDING_ID], capacity: event.target.value } })} /><button className="erp-button" onClick={(event) => addRoom(event, building.BUILDING_ID)} type="button">Add room</button></article>)}</section>
    <section className="mt-8 space-y-3"><h2 className="text-xl font-semibold">Hostel applications</h2>{hostelApplications.filter((application) => application.STATUS === "REQUESTED").map((application) => <article className="erp-panel flex flex-wrap items-center justify-between gap-3 p-4" key={application.APPLICATION_ID}><div><strong>{application.ROLL_NUMBER} · {application.FIRST_NAME} {application.LAST_NAME || ""}</strong><p className="text-sm text-white/60">{application.ACADEMIC_YEAR} · preference: {application.PREFERRED_BUILDING || "any"} · {application.REASON || "no reason supplied"}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Room for allocation" className="rounded px-2 py-2 text-sm text-black" value={allocations[application.APPLICATION_ID]?.roomId || ""} onChange={(event) => setAllocations({ ...allocations, [application.APPLICATION_ID]: { ...allocations[application.APPLICATION_ID], roomId: event.target.value } })}><option value="">Room</option>{rooms.filter((room) => room.STATUS === "ACTIVE" && Number(room.OCCUPIED) < Number(room.CAPACITY)).map((room) => <option value={room.ROOM_ID} key={room.ROOM_ID}>{room.BUILDING_NAME} · {room.ROOM_NUMBER} ({room.OCCUPIED}/{room.CAPACITY})</option>)}</select><input aria-label="Bed number" className="w-20 rounded px-2 py-2 text-black" type="number" min="1" placeholder="Bed" value={allocations[application.APPLICATION_ID]?.bedNumber || ""} onChange={(event) => setAllocations({ ...allocations, [application.APPLICATION_ID]: { ...allocations[application.APPLICATION_ID], bedNumber: event.target.value } })} /><button className="erp-button px-3 py-2 text-xs" onClick={() => send(`/hostel/applications/${application.APPLICATION_ID}/review`, "POST", { decision: "APPROVE", roomId: allocations[application.APPLICATION_ID]?.roomId, bedNumber: Number(allocations[application.APPLICATION_ID]?.bedNumber) })} type="button">Allocate</button><button className="rounded border border-white/30 px-3 py-2 text-xs" onClick={() => send(`/hostel/applications/${application.APPLICATION_ID}/review`, "POST", { decision: "REJECT" })} type="button">Reject</button></div></article>)}</section>
    <section className="mt-8 space-y-3"><h2 className="text-xl font-semibold">Maintenance queue</h2>{maintenance.map((item) => <article className="flex flex-wrap items-center justify-between gap-3 border-y border-white/15 py-3" key={item.REQUEST_ID}><p>{item.BUILDING_NAME} {item.ROOM_NUMBER} · {item.ROLL_NUMBER} · {item.CATEGORY}: {item.DESCRIPTION}</p><select aria-label={`Maintenance status ${item.REQUEST_ID}`} className="rounded px-2 py-2 text-black" value={item.STATUS} onChange={(event) => send(`/hostel/maintenance/${item.REQUEST_ID}/status`, "PATCH", { status: event.target.value })}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CANCELLED</option></select></article>)}</section>
    <form className="erp-panel mt-8 grid gap-3 p-5 md:grid-cols-2" onSubmit={createProject}><h2 className="text-xl font-semibold md:col-span-2">Research opportunity</h2><input className="erp-input" placeholder="Project title" required value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /><input className="erp-input" placeholder="Supervisor" value={project.supervisor} onChange={(event) => setProject({ ...project, supervisor: event.target.value })} /><textarea className="erp-input md:col-span-2" placeholder="Project description" required value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} /><input className="erp-input" type="date" required value={project.applicationDeadline} onChange={(event) => setProject({ ...project, applicationDeadline: event.target.value })} /><input className="erp-input" type="number" min="1" max="100" value={project.capacity} onChange={(event) => setProject({ ...project, capacity: Number(event.target.value) })} /><button className="erp-button md:col-span-2 md:w-fit" type="submit">Publish opportunity</button></form>
    <section className="mt-8 space-y-3"><h2 className="text-xl font-semibold">Research applications</h2>{researchApplications.filter((application) => ["SUBMITTED", "UNDER_REVIEW"].includes(application.STATUS)).map((application) => <article className="flex flex-wrap justify-between gap-3 border-y border-white/15 py-3" key={application.APPLICATION_ID}><div><strong>{application.PROJECT_TITLE} · {application.ROLL_NUMBER}</strong><p className="text-sm text-white/65">{application.FIRST_NAME} {application.LAST_NAME || ""}</p><p className="mt-1 text-sm">{application.STATEMENT}</p></div><div className="flex gap-2"><button className="erp-button px-3 py-2 text-xs" onClick={() => send(`/research/applications/${application.APPLICATION_ID}/review`, "PATCH", { decision: "ACCEPT" })} type="button">Accept</button><button className="rounded border border-white/30 px-3 py-2 text-xs" onClick={() => send(`/research/applications/${application.APPLICATION_ID}/review`, "PATCH", { decision: "REJECT" })} type="button">Reject</button></div></article>)}</section>
    </div></main>;
};

export default CampusAdministration;