import { useState } from "react";
import folderIcon from "../assets/icons/folder.png";
import backIcon from "../assets/icons/backBtn.png";


const Assignments = () => {
  const [selected, setSelected] = useState(null);

  const assignments = [
    {
      id: 1,
      title: "DBMS",
      dueDate: "2025-04-10",
      status: "Pending",
      description: "Design an ER model and write queries for a sample database."
    },
    {
      id: 2,
      title: "React.js UI Design",
      dueDate: "2025-04-15",
      status: "Completed",
      description: "Create a responsive frontend using React and Tailwind CSS."
    },
    {
      id: 3,
      title: "Operating Systems Research",
      dueDate: "2025-04-18",
      status: "Pending",
      description: "Prepare a report on memory management techniques in modern OS."
    }
  ];




  return (
    <div className="p-6 min-h-screen">
      <h2 className="text-3xl text-white mb-6">Assignments</h2>

      {!selected ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              onClick={() => setSelected(assignment)}
              className="cursor-pointer flex flex-col items-center p-4 bg-white/10 hover:bg-white/20 rounded-xl transition"
            >
              <img src={folderIcon} alt="Folder" className="w-16 h-16 mb-2" />
              <span className="text-white text-center font-semibold">{assignment.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative max-w-2xl">
          
          <button
            onClick={() => setSelected(null)}
            className=" -top-10 left-0 flex items-center gap-2 text-white/70 hover:text-white"
          >
            <img src={backIcon} alt="Back" className="w-8 h-8 opacity-100" />
            <span className="">Back</span>
          </button>

          <div className="flex" >

         
          <div className="mt-4 md:w-[500px] bg-white/10 p-6 rounded-xl border border-white/20 text-white backdrop-blur-md">
            <h3 className="text-2xl font-bold mb-4">{selected.title}</h3>
            <p><span className="font-semibold">Due Date:</span> {selected.dueDate}</p>
            <p className="mt-2">
              <span className="font-semibold">Status:</span>{" "}
              <span className={selected.status === "Completed" ? "text-green-400" : "text-yellow-300"}>
                {selected.status}
              </span>
            </p>
            <p className="mt-4">
              <span className="font-semibold">Description:</span><br />
              {selected.description}
            </p>
          </div>

          <div className="ms-6 mt-6 md:w-[400px] bg-white/10 p-6 rounded-xl border border-white/20 text-white backdrop-blur-md max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Faculty Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Name:</span> Dr. Priya Mehta</p>
              <p><span className="font-semibold">Department:</span> Computer Science</p>
              <p><span className="font-semibold">Email:</span> priya.mehta@university.edu</p>
              <p><span className="font-semibold">Contact:</span> +91 98765 43210</p>
            </div>
          </div>

          </div>

        </div>

      )}
    </div>
  );
};



export default Assignments;