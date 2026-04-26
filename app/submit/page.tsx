import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SubmitForm from "./form";

export default async function SubmitPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>Your profile is still being set up. Refresh in a moment.</p>
      </div>
    );
  }

  return <SubmitForm profile={profile} />;
}
