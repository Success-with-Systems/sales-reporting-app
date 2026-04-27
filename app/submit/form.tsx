"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const setterFields = [
  { key: "discoveries_booked", label: "Discoveries booked" },
  { key: "discoveries_sat", label: "Discoveries sat" },
  { key: "no_shows", label: "No-shows" },
  { key: "rebooked", label: "Rebooked" },
  { key: "consults_booked", label: "Consults booked" },
  { key: "consults_confirmed", label: "Consults confirmed" },
  { key: "dials_done", label: "Dials done" },
  { key: "bookings_from_dials", label: "Bookings from dials" },
];

const closerFields = [
  { key: "first_time_consults", label: "1st-time consults" },
  { key: "qualified_in", label: "Qualified in" },
  { key: "qualified_out", label: "Qualified out" },
  { key: "offer_presented", label: "Offer presented" },
  { key: "closed_sales", label: "Closed sales" },
  { key: "follow_up_calls_booked", label: "Follow-ups booked" },
  { key: "follow_up_calls_sat", label: "Follow-ups sat" },
  { key: "follow_ups_rescheduled", label: "Follow-ups rescheduled" },
];

export default function SubmitForm({ profile }: { profile: any }) {
  const router = useRouter();

  // Determine which roles this agent can submit as.
  // - agent_type 'setter' → setter only
  // - agent_type 'closer' → closer only
  // - agent_type 'both' or null, or role manager/admin → can pick
  const canPickRole =
    !profile?.agent_type ||
    profile.agent_type === "both" ||
    profile.role === "manager" ||
    profile.role === "admin";

  const initialRole: "setter" | "closer" =
    profile?.agent_type === "closer" ? "closer" : "setter";

  const [role, setRole] = useState<"setter" | "closer">(initialRole);
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fields = role === "setter" ? setterFields : closerFields;

  const submit = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();

    const payload = {
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      date,
      role_type: role,
      notes: notes || null,
      ...values,
    };

    const { error } = await supabase.from("submissions").upsert(payload, {
      onConflict: "user_id,date,role_type",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-1">Submit numbers</h1>
      <p className="text-sm text-gray-600 mb-6">Fill in your end-of-day metrics</p>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            {canPickRole ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="setter">Setter</option>
                <option value="closer">Closer</option>
              </select>
            ) : (
              <input
                value={role === "setter" ? "Setter" : "Closer"}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm mb-1">{f.label}</label>
              <input
                type="number"
                min="0"
                value={values[f.key] || ""}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: parseInt(e.target.value) || 0 })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={submit}
            disabled={loading}
            className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Saving..." : "Submit"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-600 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
