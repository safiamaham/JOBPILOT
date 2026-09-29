"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-gray-900">
            JobPilot AI
          </h1>

          <p className="mt-2 text-gray-500">
            Your AI-powered job application assistant
          </p>

        </div>


        {/* Login Card */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Login to continue to JobPilot AI.
          </p>


          {/* Email */}
          <div className="mt-6">

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>


          {/* Password */}
          <div className="mt-5">

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>


          {/* Error / Message */}
          {message && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {message}
            </div>
          )}


          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>


          {/* Signup */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Create one
            </a>
          </p>

        </div>

      </div>

    </main>
  );
}