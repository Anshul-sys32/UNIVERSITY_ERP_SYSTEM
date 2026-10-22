import { useCallback, useEffect, useState } from "react";
import { adminRequest, getCurrentUser } from "../../api/roleApi";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const blankSlot = { courseId: "", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", room: "" };

const AdminTimetableManagement = () => {
  const userId = getCurrentUser()?.user_id;
  const [audience, setAudience] = useState("student");
  const [targetId, setTargetId] = useState("");
  const [targets, setTargets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(blankSlot);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (targetId) {
        query.set("audience", audience);
        query.set("targetId", targetId);
      }
      const [courseRows, slotRows, targetRows] = await Promise.all([
        adminRequest(`/academic-data/${userId}/courses`),
        adminRequest(`/academic-data/${userId}/timetable-slots${query.size ? `?${query}` : ""}`),
        adminRequest(`/academic-data/${userId}/timetable-targets?audience=${audience}`),
      ]);
      setCourses(courseRows);
      setSlots(slotRows);
      setTargets(targetRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [audience, targetId, userId]);

  useEffect(() => { load(); }, [load]);

  const changeAudience = (nextAudience) => {
    setAudience(nextAudience);
    setTargetId("");
    setMessage("");
    setFormOpen(false);
  };

  const startCreate = () => {
    setEditingSlotId(null);
    setForm({ ...blankSlot, courseId: courses.find((course) => course.IS_ACTIVE)?.COURSE_ID?.toString() || "" });
    setFormOpen(true);
    setError("");
  };

  const startEdit = (slot) => {
    setEditingSlotId(slot.SLOT_ID);
    setForm({
      courseId: String(slot.COURSE_ID),
      dayOfWeek: slot.DAY_OF_WEEK,
      startTime: String(slot.START_TIME).slice(0, 5),
      endTime: String(slot.END_TIME).slice(0, 5),
      room: slot.ROOM || "",
    });
    setFormOpen(true);
    setError("");
  };

  const saveSlot = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await adminRequest(`/academic-data/${userId}/timetable-slots${editingSlotId ? `/${editingSlotId}` : ""}`, {
        method: editingSlotId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setFormOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (slot) => {
    if (!window.confirm(`Delete ${slot.COURSE_CODE} on ${slot.DAY_OF_WEEK} at ${String(slot.START_TIME).slice(0, 5)}?`)) return;
    setError("");
    setMessage("");
    try {
      const result = await adminRequest(`/academic-data/${userId}/timetable-slots/${slot.SLOT_ID}`, { method: "DELETE" });
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const targetLabel = (target) => audience === "student"
    ? `${target.ROLL_NUMBER || target.USERNAME} · ${target.FIRST_NAME} ${target.LAST_NAME || ""}`.trim()
    : `${target.FIRST_NAME} ${target.LAST_NAME || ""} · ${target.DEPARTMENT || target.USERNAME}`.trim();

  return (
    <main className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs uppercase text-white/55">Academic administration</p>
          <h1 className="mt-2 text-3xl font-bold">Student & faculty timetables</h1>
          <p className="mt-2 max-w-4xl text-sm text-white/65">Schedules belong to courses. Enrolled students and the course’s assigned faculty share the same timetable slots.</p>
        </header>

        <div className="flex flex-wrap items-end gap-3 border-b border-white/15 pb-5">
          <label className="min-w-44 text-sm" htmlFor="timetable-audience">View schedule for
            <select className="erp-input mt-1" id="timetable-audience" value={audience} onChange={(event) => changeAudience(event.target.value)}>
              <option value="student">Students</option><option value="faculty">Faculty</option>
            </select>
          </label>
          <label className="min-w-64 text-sm" htmlFor="timetable-person">Person (optional)
            <select className="erp-input mt-1" id="timetable-person" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              <option value="">All course schedules</option>
              {targets.map((target) => <option key={target.USER_ID} value={target.USER_ID}>{targetLabel(target)}</option>)}
            </select>
          </label>
          <button className="erp-button" disabled={!courses.length} onClick={startCreate} type="button">Add timetable slot</button>
        </div>

        {message && <p className="border-l-2 border-green-300 px-4 py-2 text-sm text-green-100">{message}</p>}
        {error && <p className="border-l-2 border-red-300 px-4 py-2 text-sm text-red-100">{error}</p>}

        {formOpen && <form className="grid gap-3 border-b border-white/15 pb-6 sm:grid-cols-2 xl:grid-cols-3" onSubmit={saveSlot}>
          <h2 className="text-lg font-semibold sm:col-span-2 xl:col-span-3">{editingSlotId ? "Edit timetable slot" : "Add timetable slot"}</h2>
          <label className="text-sm" htmlFor="timetable-course">Course
            <select className="erp-input mt-1" id="timetable-course" required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
              <option value="">Select course</option>
              {courses.map((course) => <option key={course.COURSE_ID} value={course.COURSE_ID}>{course.COURSE_CODE} · {course.TITLE}{course.IS_ACTIVE ? "" : " (inactive)"}</option>)}
            </select>
          </label>
          <label className="text-sm" htmlFor="timetable-day">Day
            <select className="erp-input mt-1" id="timetable-day" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}>{days.map((day) => <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>)}</select>
          </label>
          <label className="text-sm" htmlFor="timetable-start">Start time<input className="erp-input mt-1" id="timetable-start" type="time" required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label className="text-sm" htmlFor="timetable-end">End time<input className="erp-input mt-1" id="timetable-end" type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <label className="text-sm" htmlFor="timetable-room">Room<input className="erp-input mt-1" id="timetable-room" maxLength={80} value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} /></label>
          <div className="flex items-end gap-2"><button className="erp-button" disabled={saving} type="submit">{saving ? "Saving…" : editingSlotId ? "Save changes" : "Create slot"}</button><button className="rounded border border-white/25 px-4 py-3 text-sm" onClick={() => setFormOpen(false)} type="button">Cancel</button></div>
        </form>}

        <div className="overflow-x-auto border-y border-white/15">
          {loading ? <p className="p-5 text-sm text-white/60">Loading timetable…</p> : <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="text-xs uppercase text-white/55">{["Day", "Time", "Course", "Semester", "Faculty", "Students", "Room", "Actions"].map((heading) => <th className="px-3 py-3" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{slots.map((slot) => <tr className="border-t border-white/10" key={slot.SLOT_ID}>
              <td className="px-3 py-3">{slot.DAY_OF_WEEK}</td><td className="whitespace-nowrap px-3 py-3">{String(slot.START_TIME).slice(0, 5)}–{String(slot.END_TIME).slice(0, 5)}</td>
              <td className="px-3 py-3">{slot.COURSE_CODE} · {slot.TITLE}</td><td className="px-3 py-3">{slot.SEMESTER}</td>
              <td className="px-3 py-3">{slot.FACULTY_FIRST_NAME ? `${slot.FACULTY_FIRST_NAME} ${slot.FACULTY_LAST_NAME || ""}` : "Unassigned"}</td>
              <td className="px-3 py-3">{slot.REGISTERED_STUDENTS}</td><td className="px-3 py-3">{slot.ROOM || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2"><button className="rounded px-2 py-1 text-xs text-sky-200 hover:bg-white/10" onClick={() => startEdit(slot)} type="button">Edit</button><button className="rounded px-2 py-1 text-xs text-red-200 hover:bg-white/10" onClick={() => deleteSlot(slot)} type="button">Delete</button></td>
            </tr>)}</tbody>
          </table>}
          {!loading && !slots.length && <p className="p-5 text-sm text-white/55">No timetable slots match this view.</p>}
        </div>
      </div>
    </main>
  );
};

export default AdminTimetableManagement;
