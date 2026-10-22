import { useCallback, useEffect, useState } from "react";
import { operationsRequest } from "../../api/roleApi";

const emptyForm = { studentId: "", detail: "", amount: "", dueDate: "", status: "UNPAID", transactionId: "" };

const Accounting = () => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setData(await operationsRequest("/accounting/summary"));
  }, []);

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await operationsRequest("/accounting", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setForm(emptyForm);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateStatus = async (ledgerId, status) => {
    try {
      const result = await operationsRequest(`/accounting/${ledgerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8"><p className="text-xs uppercase tracking-[0.3em] text-white/60">Employee operations</p><h2 className="mt-2 text-3xl font-bold">Accounting</h2><p className="mt-2 text-white/70">Manage fee ledgers and payment status.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">{[["Total entries", data?.totals?.TOTAL || 0], ["Billed amount", `₹${Number(data?.totals?.AMOUNT || 0).toLocaleString("en-IN")}`], ["Outstanding", `₹${Number(data?.outstanding?.AMOUNT || 0).toLocaleString("en-IN")}`]].map(([label, value]) => <div className="erp-panel p-5" key={label}><p className="text-sm text-white/60">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></div>)}</div>
        <form className="erp-panel mt-6 grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3" onSubmit={submit}><input className="erp-input" type="number" min="1" placeholder="Student ID" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required /><input className="erp-input" placeholder="Fee detail" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} required /><input className="erp-input" type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /><input className="erp-input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /><input className="erp-input" placeholder="Transaction ID" value={form.transactionId} onChange={(event) => setForm({ ...form, transactionId: event.target.value })} /><select className="erp-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option className="text-black">UNPAID</option><option className="text-black">PENDING</option><option className="text-black">PAID</option><option className="text-black">WAIVED</option></select><button className="erp-button lg:col-span-3 lg:w-fit" type="submit">Create ledger entry</button></form>
        {message && <p className="mt-4 rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="mt-4 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/20 bg-white/10"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-white text-black"><tr>{["Student", "Detail", "Amount", "Due date", "Status", "Action"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr></thead><tbody>{data?.recent?.map((item) => <tr className="border-t border-white/15" key={item.LEDGER_ID}><td className="p-4">{item.FIRST_NAME} {item.LAST_NAME || ""}<span className="ml-2 text-xs text-white/50">{item.ROLL_NUMBER || ""}</span></td><td className="p-4">{item.DETAIL}</td><td className="p-4">₹{Number(item.AMOUNT).toLocaleString("en-IN")}</td><td className="p-4 text-white/70">{item.DUE_DATE || "—"}</td><td className="p-4 font-semibold">{item.STATUS}</td><td className="p-4"><select className="rounded-lg bg-white px-2 py-1 text-xs text-slate-900" value={item.STATUS} onChange={(event) => updateStatus(item.LEDGER_ID, event.target.value)}><option value="UNPAID">Unpaid</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="WAIVED">Waived</option></select></td></tr>)}</tbody></table></div>
      </div>
    </section>
  );
};

export default Accounting;
