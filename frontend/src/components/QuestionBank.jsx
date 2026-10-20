const QuestionBank = () => {
  const questionPapers = [
    { id: 1, subject: "Data Structures", year: "2024", downloadLink: "#" },
    { id: 2, subject: "Operating Systems", year: "2023", downloadLink: "#" },
    { id: 3, subject: "Computer Networks", year: "2024", downloadLink: "#" },
    { id: 4, subject: "Database Management", year: "2022", downloadLink: "#" }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Question Bank</h2>
      <div className="bg-white/10 p-6 rounded-lg backdrop-blur-lg border border-white/20">
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr className="text-white">
              <th className="p-3 border-b border-white/20 text-left">Subject</th>
              <th className="p-3 border-b border-white/20 text-left">Year</th>
              <th className="p-3 border-b border-white/20 text-left">Download</th>
            </tr>
          </thead>
          <tbody>
            {questionPapers.map((paper) => (
              <tr key={paper.id} className="text-white hover:bg-white/10 transition-all">
                <td className="p-3 border-b border-white/20">{paper.subject}</td>
                <td className="p-3 border-b border-white/20">{paper.year}</td>
                <td className="p-3 border-b border-white/20">
                  <a href={paper.downloadLink} className="text-blue-400 underline">
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionBank;
