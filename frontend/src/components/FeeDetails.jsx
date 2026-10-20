const FeeDetails = () => {
  const transactions = [
    { sno: 1, detail: "Tuition Fee - Sem 1", lastDate: "2024-01-10", amount: "₹16,000", transactionId: "TXN123456789", status: "Paid" },
    { sno: 2, detail: "Library Fee - Sem 1", lastDate: "2024-01-15", amount: "₹2,500", transactionId: "TXN123456790", status: "Paid" },
    { sno: 3, detail: "Sports Fee - Sem 1", lastDate: "2024-01-20", amount: "₹1,000", transactionId: "TXN123456791", status: "Paid" },
    { sno: 4, detail: "Tuition Fee - Sem 2", lastDate: "2024-06-10", amount: "₹16,000", transactionId: "", status: "Unpaid" },
    { sno: 5, detail: "Library Fee - Sem 2", lastDate: "2024-06-15", amount: "₹2,500", transactionId: "", status: "Unpaid" },
    { sno: 6, detail: "Sports Fee - Sem 2", lastDate: "2024-06-20", amount: "₹1,500", transactionId: "", status: "Unpaid" },
    { sno: 7, detail: "Exam Fee - Sem 1", lastDate: "2024-01-25", amount: "₹1,200", transactionId: "TXN123456792", status: "Paid" },
    { sno: 8, detail: "Exam Fee - Sem 2", lastDate: "2024-06-25", amount: "₹1,200", transactionId: "", status: "Unpaid" },
    { sno: 9, detail: "Development Fee", lastDate: "2024-02-10", amount: "₹2,000", transactionId: "TXN123456793", status: "Paid" },
    { sno: 10, detail: "Late Fee", lastDate: "2024-03-01", amount: "₹500", transactionId: "", status: "Unpaid" },
  ];

  return (
    <div className="p-6 min-h-screen">
      <h2 className="text-3xl text-white mb-6 font-semibold">Fee Transactions</h2>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden shadow-lg max-h-[400px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-white text-sm">
          <thead className="sticky top-0 bg-white/100 text-black">
            <tr className="text-left border-b border-white/30">
              <th className="p-4">S.No</th>
              <th className="p-4">Detail</th>
              <th className="p-4">Last Date</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Transaction ID</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.sno} className="border-b border-white/20">
                <td className="p-4">{item.sno}</td>
                <td className="p-4">{item.detail}</td>
                <td className="p-4">{item.lastDate}</td>
                <td className="p-4">{item.amount}</td>
                <td className="p-4">{item.transactionId || "—"}</td>
                <td className="p-4 font-semibold">
                  <span
                    className={`${
                      item.status === "Paid" ? "text-green-400" : "text-yellow-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeeDetails;
