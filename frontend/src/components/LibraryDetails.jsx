const LibraryDetails = () => {
  const booksIssued = [
    { id: 1, title: "Operating Systems", issueDate: "2025-03-01", returnDate: "2025-03-30", status: "Returned" },
    { id: 2, title: "Data Structures & Algorithms", issueDate: "2025-03-05", returnDate: "2025-04-05", status: "Pending" },
    { id: 3, title: "Computer Networks", issueDate: "2025-03-10", returnDate: "2025-04-10", status: "Pending" }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Library Details</h2>
      <div className="bg-white/10 p-6 rounded-lg backdrop-blur-lg border border-white/20">
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr className="text-white">
              <th className="p-3 border-b border-white/20 text-left">Book Title</th>
              <th className="p-3 border-b border-white/20 text-left">Issue Date</th>
              <th className="p-3 border-b border-white/20 text-left">Return Date</th>
              <th className="p-3 border-b border-white/20 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {booksIssued.map((book) => (
              <tr key={book.id} className="text-white hover:bg-white/10 transition-all">
                <td className="p-3 border-b border-white/20">{book.title}</td>
                <td className="p-3 border-b border-white/20">{book.issueDate}</td>
                <td className="p-3 border-b border-white/20">{book.returnDate}</td>
                <td
                  className={`p-3 border-b border-white/20 font-semibold ${
                    book.status === "Returned" ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {book.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LibraryDetails;
