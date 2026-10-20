import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate, formatMoney } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const FeeDetails = () => {
  const [fees, setFees] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("fees")
      .then(setFees)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Fee transactions</h2>
      <p className="mb-6 text-sm text-white/70">Review current and completed payments.</p>
      <StudentDataState {...state} empty={!fees.length}>
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
          <table className="w-full min-w-[720px] text-left text-sm text-white">
            <thead className="bg-white text-black">
              <tr>{["Detail", "Due date", "Amount", "Transaction", "Status"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr className="border-b border-white/15" key={fee.FEE_ID}>
                  <td className="p-4 font-medium">{fee.DETAIL}</td>
                  <td className="p-4 text-white/75">{formatDate(fee.DUE_DATE)}</td>
                  <td className="p-4">{formatMoney(fee.AMOUNT)}</td>
                  <td className="p-4 text-white/75">{fee.TRANSACTION_ID || "—"}</td>
                  <td className={`p-4 font-semibold ${fee.STATUS === "PAID" ? "text-green-300" : "text-yellow-200"}`}>{fee.STATUS}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StudentDataState>
    </section>
  );
};

export default FeeDetails;
