import React, { useState } from "react";

const PasswordResetPopup = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error resetting password");
        return;
      }

      alert("Password reset successfully!");
      onClose();
    } catch (error) {
      alert("Something went wrong!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[350px]">
        <h2 className="text-xl font-bold mb-4 text-center">Reset Password</h2>
        <form className="space-y-4" onSubmit={handleReset}>
          <input
            type="password"
            placeholder="Current Password"
            className="w-full px-3 py-2 rounded border"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-3 py-2 rounded border"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-red-600 font-semibold">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPopup;
