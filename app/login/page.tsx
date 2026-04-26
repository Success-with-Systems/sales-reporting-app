"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const sendCode = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) setError(error.message);
    else setStep("code");
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-2">Sales Reporting</h1>
        <p className="text-sm text-gray-600 mb-6">
          {step === "email"
            ? "Enter your email to sign in"
            : "Enter the 6-digit code we sent you"}
        </p>

        {step === "email" ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <button
              onClick={sendCode}
              disabled={loading || !email}
              className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full border rounded px-3 py-2 mb-4 font-mono text-center text-lg tracking-widest"
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="w-full bg-black text-white py-2 rounded disabled:opacity-50 mb-2"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              onClick={() => setStep("email")}
              className="w-full text-sm text-gray-600 py-2"
            >
              Use a different email
            </button>
          </>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
