const StudentDataState = ({ loading, error, empty, children }) => {
  if (loading) return <p className="rounded-2xl bg-white/10 p-6 text-white/75">Loading your records…</p>;
  if (error) return <p className="rounded-2xl border border-yellow-200/30 bg-yellow-200/10 p-6 text-yellow-100">{error}</p>;
  if (empty) return <p className="rounded-2xl bg-white/10 p-6 text-white/75">No records are available yet.</p>;
  return children;
};

export default StudentDataState;
