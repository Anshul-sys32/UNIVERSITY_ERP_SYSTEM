import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate } from "../../api/studentApi";
import StudentDataState from "../../components/StudentDataState";

const fields = [
  ["Roll number", "ROLL_NUMBER"],
  ["Admission number", "ADMISSION_NUMBER"],
  ["Email", "EMAIL"],
  ["Phone", "PHONE_NUMBER"],
  ["Program ID", "PROGRAM_ID"],
  ["Department ID", "DEPARTMENT_ID"],
  ["Batch year", "BATCH_YEAR"],
  ["Current semester", "CURRENT_SEMESTER"],
  ["Admission date", "ADMISSION_DATE", formatDate],
  ["Enrollment status", "STATUS"],
];

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchStudentResource("profile")
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message });
      })
      .finally(() => {
        if (active) setState((current) => ({ ...current, loading: false }));
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="space-y-6 p-6">
      <header>
        <h2 className="text-3xl font-bold text-white">My profile</h2>
        <p className="mt-2 text-sm text-white/70">Your official identity and current academic details.</p>
      </header>
      <StudentDataState {...state} empty={!profile}>
        {profile && <>
          <section className="border-b border-white/20 pb-6 text-white">
            <p className="text-xs uppercase text-white/55">Student record</p>
            <h3 className="mt-2 text-2xl font-semibold">{profile.FIRST_NAME} {profile.LAST_NAME || ""}</h3>
            <p className="mt-1 text-sm text-white/70">{profile.ROLL_NUMBER || "Roll number not assigned"}</p>
          </section>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, key, format]) => (
              <div className="border-b border-white/15 pb-3" key={key}>
                <dt className="text-xs text-white/55">{label}</dt>
                <dd className="mt-1 break-words text-sm text-white">{format ? format(profile[key]) : profile[key] || "Not recorded"}</dd>
              </div>
            ))}
          </dl>
        </>}
      </StudentDataState>
    </section>
  );
};

export default StudentProfile;