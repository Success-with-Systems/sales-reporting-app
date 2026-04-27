import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; agent?: string };
}) {
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

  if (!profile) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>Your profile is still being set up. Refresh in a moment.</p>
      </div>
    );
  }

  const isManager = profile.role === "manager" || profile.role === "admin";
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const from = searchParams?.from || thirtyDaysAgo;
  const to = searchParams?.to || today;
  const agentFilter = searchParams?.agent || "";

  let q = supabase
    .from("submissions")
    .select("*, profiles(id, full_name, email, agent_type)")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (isManager && agentFilter) {
    q = q.eq("user_id", agentFilter);
  }

  const { data: submissions } = await q;
  const rows = submissions || [];

  let tenantAgents: any[] = [];
  if (isManager) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, agent_type, role")
      .eq("tenant_id", profile.tenant_id)
      .order("full_name");
    tenantAgents = data || [];
  }

  const totals = (rows as any[]).reduce(
    (acc: any, s: any) => ({
      dials: acc.dials + (s.dials_done || 0),
      bookings: acc.bookings + (s.bookings_from_dials || 0),
      consults: acc.consults + (s.consults_booked || 0),
      offers: acc.offers + (s.offer_presented || 0),
      sales: acc.sales + (s.closed_sales || 0),
      submissions: acc.submissions + 1,
    }),
    { dials: 0, bookings: 0, consults: 0, offers: 0, sales: 0, submissions: 0 }
  );

  const perAgent = new Map<string, any>();
  if (isManager) {
    for (const s of rows as any[]) {
      const id = s.user_id;
      const cur = perAgent.get(id) || {
        id,
        name: s.profiles?.full_name || s.profiles?.email,
        agent_type: s.profiles?.agent_type,
        dials: 0,
        bookings: 0,
        consults: 0,
        offers: 0,
        sales: 0,
        submissions: 0,
      };
      cur.dials += s.dials_done || 0;
      cur.bookings += s.bookings_from_dials || 0;
      cur.consults += s.consults_booked || 0;
      cur.offers += s.offer_presented || 0;
      cur.sales += s.closed_sales || 0;
      cur.submissions += 1;
      perAgent.set(id, cur);
    }
  }

  const tenantName = (profile as any)?.tenants?.name || "";
  const roleLabel =
    profile.role === "admin"
      ? "Admin"
      : profile.role === "manager"
      ? "Manager"
      : profile.agent_type === "closer"
      ? "Closer"
      : profile.agent_type === "setter"
      ? "Setter"
      : "Agent";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            {tenantName ? tenantName + " · " : ""}
            {roleLabel} · {user.email}
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

      <form
        method="get"
        className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-end"
      >
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input type="date" name="from" defaultValue={from} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input type="date" name="to" defaultValue={to} className="border rounded px-2 py-1 text-sm" />
        </div>
        {isManager && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Agent</label>
            <select name="agent" defaultValue={agentFilter} className="border rounded px-2 py-1 text-sm">
              <option value="">All agents</option>
              {tenantAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded">Apply</button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Stat label="Submissions" value={totals.submissions} />
        <Stat label="Dials" value={totals.dials} />
        <Stat label="Bookings" value={totals.bookings} />
        <Stat label="Offers" value={totals.offers} />
        <Stat label="Closed Sales" value={totals.sales} />
      </div>

      {isManager && perAgent.size > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Per agent</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-3">Agent</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Days</th>
                <th className="px-6 py-3">Dials</th>
                <th className="px-6 py-3">Bookings</th>
                <th className="px-6 py-3">Offers</th>
                <th className="px-6 py-3">Closed</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(perAgent.values())
                .sort((a, b) => b.sales - a.sales)
                .map((a: any) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-6 py-3">{a.name}</td>
                    <td className="px-6 py-3 capitalize">{a.agent_type || "—"}</td>
                    <td className="px-6 py-3">{a.submissions}</td>
                    <td className="px-6 py-3">{a.dials}</td>
                    <td className="px-6 py-3">{a.bookings}</td>
                    <td className="px-6 py-3">{a.offers}</td>
                    <td className="px-6 py-3 font-semibold">{a.sales}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Submissions</h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No submissions in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-3">Date</th>
                {isManager && <th className="px-6 py-3">Agent</th>}
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Key metric</th>
              </tr>
            </thead>
            <tbody>
              {(rows as any[]).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-6 py-3">{s.date}</td>
                  {isManager && (
                    <td className="px-6 py-3">
                      {s.profiles?.full_name || s.profiles?.email}
                    </td>
                  )}
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
