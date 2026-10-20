const EventsPlacement = () => {
  const events = [
    { id: 1, title: "Tech Fest 2025", date: "2025-04-15", location: "Main Auditorium", type: "Event" },
    { id: 2, title: "Google Campus Drive", date: "2025-04-20", location: "Placement Hall", type: "Placement" },
    { id: 3, title: "AI Workshop", date: "2025-04-25", location: "Lab 3", type: "Event" },
    { id: 4, title: "Microsoft Internship Interviews", date: "2025-05-01", location: "Placement Office", type: "Placement" }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Events & Placement</h2>
      <div className="bg-white/10 p-6 rounded-lg backdrop-blur-lg border border-white/20">
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr className="text-white">
              <th className="p-3 border-b border-white/20 text-left">Title</th>
              <th className="p-3 border-b border-white/20 text-left">Date</th>
              <th className="p-3 border-b border-white/20 text-left">Location</th>
              <th className="p-3 border-b border-white/20 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="text-white hover:bg-white/10 transition-all">
                <td className="p-3 border-b border-white/20">{event.title}</td>
                <td className="p-3 border-b border-white/20">{event.date}</td>
                <td className="p-3 border-b border-white/20">{event.location}</td>
                <td
                  className={`p-3 border-b border-white/20 font-semibold ${
                    event.type === "Event" ? "text-blue-400" : "text-green-400"
                  }`}
                >
                  {event.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsPlacement;
