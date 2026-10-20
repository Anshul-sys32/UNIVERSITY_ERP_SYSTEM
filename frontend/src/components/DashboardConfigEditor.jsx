import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const initialConfigs = {
  student: {
    background: "linear-gradient(300deg,rgba(67,10,199,0.96),rgba(255,35,15,0.95))",
    sidebarItems: [
      { label: "Dashboard", path: "/erp/student" },
      { label: "Assignments", path: "/erp/student/assignments" },
      { label: "Fee Details", path: "/erp/student/fees" },
      { label: "Library Details", path: "/erp/student/library" },
    ],
  },
  faculty: {
    background: "linear-gradient(300deg,rgba(0,0,0,0.8),rgba(255,165,0,0.8))",
    sidebarItems: [
      { label: "Dashboard", path: "/erp/faculty" },
      { label: "Assignments", path: "/erp/faculty/assignments" },
    ],
  },
  staff: {
    background: "linear-gradient(300deg,rgba(0,0,0,0.8),rgba(0,255,255,0.8))",
    sidebarItems: [
      { label: "Dashboard", path: "/erp/staff" },
      { label: "Attendance", path: "/erp/staff/attendance" },
    ],
  },
};

const DashboardConfigEditor = () => {
  const { type } = useParams(); // student / faculty / staff
  const [config, setConfig] = useState(null);
  const [newSidebarLabel, setNewSidebarLabel] = useState("");
  const [newSidebarPath, setNewSidebarPath] = useState("");

  useEffect(() => {
    if (type && initialConfigs[type]) {
      setConfig(initialConfigs[type]);
    }
  }, [type]);

  if (!config) {
    return <div className="text-center text-white p-10">Invalid dashboard type!</div>;
  }

  const handleBackgroundChange = (e) => {
    setConfig((prev) => ({
      ...prev,
      background: e.target.value,
    }));
  };

  const handleAddSidebarItem = () => {
    if (newSidebarLabel.trim() && newSidebarPath.trim()) {
      setConfig((prev) => ({
        ...prev,
        sidebarItems: [...prev.sidebarItems, { label: newSidebarLabel, path: newSidebarPath }],
      }));
      setNewSidebarLabel("");
      setNewSidebarPath("");
    }
  };

  const handleRemoveSidebarItem = (index) => {
    setConfig((prev) => ({
      ...prev,
      sidebarItems: prev.sidebarItems.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div
      className="min-h-screen p-6 flex flex-col gap-8"
      style={{
        background: config.background,
      }}
    >
      <h1 className="text-3xl text-white text-center font-bold">
        Editing {type.charAt(0).toUpperCase() + type.slice(1)} Dashboard
      </h1>

      {/* Background Color Changer */}
      <div className="bg-white/20 backdrop-blur-md p-6 rounded-lg max-w-lg mx-auto">
        <h2 className="text-xl text-white mb-4">Background</h2>
        <input
          type="text"
          placeholder="Enter background (color or gradient)"
          value={config.background}
          onChange={handleBackgroundChange}
          className="w-full p-2 rounded bg-white text-black"
        />
      </div>

      {/* Sidebar Manager */}
      <div className="bg-white/20 backdrop-blur-md p-6 rounded-lg max-w-lg mx-auto">
        <h2 className="text-xl text-white mb-4">Sidebar Items</h2>

        <ul className="space-y-2">
          {config.sidebarItems.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center text-white bg-white/10 p-2 rounded"
            >
              <span>{item.label} ({item.path})</span>
              <button
                onClick={() => handleRemoveSidebarItem(index)}
                className="bg-red-600 text-white px-2 rounded hover:bg-red-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          <input
            type="text"
            placeholder="New Item Label"
            value={newSidebarLabel}
            onChange={(e) => setNewSidebarLabel(e.target.value)}
            className="p-2 rounded bg-white text-black"
          />
          <input
            type="text"
            placeholder="New Item Path"
            value={newSidebarPath}
            onChange={(e) => setNewSidebarPath(e.target.value)}
            className="p-2 rounded bg-white text-black"
          />
          <button
            onClick={handleAddSidebarItem}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-800"
          >
            Add Sidebar Item
          </button>
        </div>
      </div>

    </div>
  );
};

export default DashboardConfigEditor;
