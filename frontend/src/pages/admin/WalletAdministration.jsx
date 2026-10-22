import { useEffect, useState } from "react";
import { walletAdminRequest } from "../../api/roleApi";

const defaultPolicy = { policyName: "", periodCode: "", programId: "", semester: "", budgetAmount: "", perStudentCap: "", expiresAt: "" };

const WalletAdministration = () => {
  const [policies, setPolicies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [policy, setPolicy] = useState(defaultPolicy);
  const [merchant, setMerchant] = useState({ userId: "", displayName: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => Promise.all([
    walletAdminRequest("/policies"),
    walletAdminRequest("/reward-requests"),
  ]).then(([policyRows, requestRows]) => {
    setPolicies(policyRows);
    setRequests(requestRows);
  });

  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, []);

  const createPolicy = async (event) => {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const response = await walletAdminRequest("/policies", { method: "POST", body: JSON.stringify({
        ...policy,
        programId: policy.programId || null,
        semester: policy.semester || null,
      }) });
      setMessage(response.message);
      setPolicy(defaultPolicy);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  const reviewRequest = async (requestId, decision) => {
    setError(""); setMessage("");
    try {
      const response = await walletAdminRequest(`/reward-requests/${requestId}/review`, { method: "POST", body: JSON.stringify({ decision }) });
      setMessage(response.message);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  const createMerchant = async (event) => {
    event.preventDefault();
    try {
      const response = await walletAdminRequest("/merchants", { method: "POST", body: JSON.stringify(merchant) });
      setMessage(response.message);
      setMerchant({ userId: "", displayName: "" });
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <section className="min-h-screen space-y-8 p-5 text-white erp-gradient sm:p-8">
      <header><p className="text-xs uppercase text-white/55">Campus credit</p><h1 className="mt-2 text-3xl font-bold">Wallet administration</h1></header>
      {message && <p className="rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <form className="erp-panel grid gap-3 p-5 md:grid-cols-3" onSubmit={createPolicy}>
        <h2 className="text-lg font-semibold md:col-span-3">Reward policy and budget</h2>
        <input className="erp-input" placeholder="Policy name" required value={policy.policyName} onChange={(event) => setPolicy({ ...policy, policyName: event.target.value })} />
        <input className="erp-input" placeholder="Period code" required value={policy.periodCode} onChange={(event) => setPolicy({ ...policy, periodCode: event.target.value })} />
        <input className="erp-input" type="number" min="0.01" step="0.01" placeholder="Total budget" required value={policy.budgetAmount} onChange={(event) => setPolicy({ ...policy, budgetAmount: event.target.value })} />
        <input className="erp-input" type="number" min="0.01" step="0.01" placeholder="Per-student cap" required value={policy.perStudentCap} onChange={(event) => setPolicy({ ...policy, perStudentCap: event.target.value })} />
        <input className="erp-input" type="number" min="1" placeholder="Program ID (optional)" value={policy.programId} onChange={(event) => setPolicy({ ...policy, programId: event.target.value })} />
        <input className="erp-input" type="number" min="1" placeholder="Semester (optional)" value={policy.semester} onChange={(event) => setPolicy({ ...policy, semester: event.target.value })} />
        <label className="text-xs text-white/65">Expiry date (optional)<input className="erp-input mt-1" type="date" value={policy.expiresAt} onChange={(event) => setPolicy({ ...policy, expiresAt: event.target.value })} /></label>
        <button className="erp-button md:col-span-3 md:w-fit" type="submit">Create policy</button>
      </form>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Reward policies</h2><div className="divide-y divide-white/15 border-y border-white/15">{policies.map((row) => <article className="flex flex-wrap justify-between gap-3 py-3" key={row.POLICY_ID}><div><strong>{row.POLICY_NAME}</strong><p className="text-sm text-white/60">{row.PERIOD_CODE} · budget {row.ISSUED_AMOUNT} / {row.BUDGET_AMOUNT} · cap {row.PER_STUDENT_CAP}</p></div><select aria-label={`Status for ${row.POLICY_NAME}`} className="rounded px-2 py-2 text-sm text-black" value={row.STATUS} onChange={async (event) => { try { await walletAdminRequest(`/policies/${row.POLICY_ID}/status`, { method: "PATCH", body: JSON.stringify({ status: event.target.value }) }); await load(); } catch (requestError) { setError(requestError.message); } }}><option>ACTIVE</option><option>PAUSED</option><option>CLOSED</option></select></article>)}</div></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Reward approvals</h2><div className="divide-y divide-white/15 border-y border-white/15">{requests.filter((row) => row.STATUS === "REQUESTED").map((row) => <article className="flex flex-wrap items-start justify-between gap-4 py-4" key={row.REQUEST_ID}><div><strong>{row.ROLL_NUMBER || row.STUDENT_ID} · {row.FIRST_NAME} {row.LAST_NAME || ""}</strong><p className="text-sm text-white/65">{row.COURSE_CODE} · {row.POLICY_NAME} · {row.AMOUNT} credits</p><p className="mt-1 text-sm">{row.REASON}</p></div><div className="flex gap-2"><button className="erp-button px-3 py-2 text-xs" onClick={() => reviewRequest(row.REQUEST_ID, "APPROVE")} type="button">Approve and credit</button><button className="rounded border border-white/30 px-3 py-2 text-xs" onClick={() => reviewRequest(row.REQUEST_ID, "REJECT")} type="button">Reject</button></div></article>)}</div>{!requests.some((row) => row.STATUS === "REQUESTED") && <p className="text-sm text-white/60">No reward requests awaiting review.</p>}</section>
      <form className="erp-panel grid gap-3 p-5 md:grid-cols-3" onSubmit={createMerchant}><h2 className="text-lg font-semibold md:col-span-3">Enable merchant account</h2><input className="erp-input" type="number" min="1" placeholder="Existing MERCHANT user ID" required value={merchant.userId} onChange={(event) => setMerchant({ ...merchant, userId: event.target.value })} /><input className="erp-input" placeholder="Outlet display name" required value={merchant.displayName} onChange={(event) => setMerchant({ ...merchant, displayName: event.target.value })} /><button className="erp-button" type="submit">Enable outlet</button></form>
    </section>
  );
};

export default WalletAdministration;