import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(name)")
    .eq("id", user.id)
    .single();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, profiles(full_name, email)")
    .order("date", { ascending: false })
    .limit(20);

  const totals = (submissions || []).reduce(
    (acc: any, s: any) => ({
      dials: acc.dials + (s.dials_done || 0),
      bookings: acc.bookings + (s.bookings_from_dials || 0),
      consults: acc.consults + (s.consults_booked || 0),
      sales: acc.sales + (s.closed_sales || 0),
    }),
    { dials: 0, bookings: 0, consults: 0, sales: 0 }
  );

  const tenantName = (profile as any)?.tenants?.name || "";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            {tenantName ? tenantName + " \u00b7 " : ""}
            {user.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/submit"
            className="bg-black text-white px-4 py-2 rounded text-sm"
          >
            Submit numbers
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-600 px-3 py-2">Sign out</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Dials" value={totals.dials} />
        <Stat label="Bookings" value={totals.bookings} />
        <Stat label="Consults Booked" value={totals.consults} />
        <Stat label="Closed Sales" value={totals.sales} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Recent submissions</h2>
        </div>
        {(submissions || []).length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">
            No submissions yet. Hit Submit numbers above to add the first one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Agent</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Key metric</th>
              </tr>
            </thead>
            <tbody>
              {(submissions as any[]).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-6 py-3">{s.date}</td>
                  <td className="px-6 py-3">
                    {s.profiles?.full_name || s.profiles?.email}
                  </td>
                  <td className="px-6 py-3 capitalize">{s.role_type}</td>
                  <td className="px-6 py-3">
                    {s.role_type === "setter"
                      ? s.dials_done + " dials, " + s.bookings_from_dials + " bookings"
                      : s.offer_presented + " offers, " + s.closed_sales + " closed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
