import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate, formatMoney, submitStudentFeePayment } from "../../api/studentApi";
import StudentDataState from "../../components/StudentDataState";

const FeeDetails = () => {
  const [fees, setFees] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [payingKey, setPayingKey] = useState("");

  const loadFees = () => fetchStudentResource("fees").then(setFees);

  useEffect(() => {
    loadFees()
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const payFee = async (fee) => {
    const feeKey = `${fee.FEE_SOURCE}:${fee.FEE_ID}`;
    setPayingKey(feeKey);
    setPaymentError("");
    setPaymentMessage("");
    try {
      const result = await submitStudentFeePayment(fee);
      setPaymentMessage(result.message);
      await loadFees();
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setPayingKey("");
    }
  };

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Fee transactions</h2>
      <p className="mb-6 text-sm text-white/70">Review current and completed payments.</p>
      <p className="mb-4 border-l-2 border-amber-300 px-3 py-2 text-sm text-amber-100">Development mock payment only. No real money is charged.</p>
      {paymentMessage && <p className="mb-4 rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{paymentMessage}</p>}
      {paymentError && <p className="mb-4 rounded-xl bg-red-300/15 p-4 text-sm text-red-100">{paymentError}</p>}
      <StudentDataState {...state} empty={!fees.length}>
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
          <table className="w-full min-w-[720px] text-left text-sm text-white">
            <thead className="bg-white text-black">
              <tr>{["Detail", "Due date", "Amount", "Transaction", "Status", "Action"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const feeKey = `${fee.FEE_SOURCE}:${fee.FEE_ID}`;
                const payable = ["UNPAID", "PENDING"].includes(fee.STATUS);
                return (
                <tr className="border-b border-white/15" key={feeKey}>
                  <td className="p-4 font-medium">{fee.DETAIL}</td>
                  <td className="p-4 text-white/75">{formatDate(fee.DUE_DATE)}</td>
                  <td className="p-4">{formatMoney(fee.AMOUNT)}</td>
                  <td className="p-4 text-white/75">{fee.TRANSACTION_ID || "—"}</td>
                  <td className={`p-4 font-semibold ${fee.STATUS === "PAID" ? "text-green-300" : "text-yellow-200"}`}>{fee.STATUS}</td>
                  <td className="p-4">
                    {payable && <button className="erp-button px-3 py-2 text-xs" disabled={Boolean(payingKey)} onClick={() => payFee(fee)} type="button">
                      {payingKey === feeKey ? "Processing…" : "Pay"}
                    </button>}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </StudentDataState>
    </section>
  );
};

export default FeeDetails;
