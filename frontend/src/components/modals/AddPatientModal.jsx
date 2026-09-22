import { useState } from "react";
import Modal from "./Modal";

const initialForm = { name: "", age: "", gender: "Female" };

const inputClasses =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110] placeholder:text-[#8a8f98] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15";
const labelClasses = "mb-1 block font-ui text-sm font-medium text-[#45545e]";

export default function AddPatientModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
    setForm(initialForm);
  }

  return (
    <Modal open={open} title="Add New Patient" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPatientName" className={labelClasses}>
            Full Name
          </label>
          <input
            id="newPatientName"
            name="name"
            type="text"
            required
            placeholder="e.g., Sunita Devi"
            value={form.name}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="newPatientAge" className={labelClasses}>
              Age
            </label>
            <input
              id="newPatientAge"
              name="age"
              type="number"
              required
              placeholder="48"
              value={form.age}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="newPatientGender" className={labelClasses}>
              Gender
            </label>
            <select
              id="newPatientGender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className={inputClasses}
            >
              <option>Female</option>
              <option>Male</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/15 px-4 py-2 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            Save Patient
          </button>
        </div>
      </form>
    </Modal>
  );
}
