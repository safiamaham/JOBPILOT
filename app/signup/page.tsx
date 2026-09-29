"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setMessage("");
    setSuccess(false);

    if (!name || !email || !password) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuccess(true);
    setMessage(
      "Account created successfully! Check your email to verify your account."
    );
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


        {/* Signup Card */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            Create your account
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Start building smarter job applications.
          </p>


          {/* Name */}
          <div className="mt-6">

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>


          {/* Email */}
          <div className="mt-5">

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
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>


          {/* Message */}
          {message && (
            <div
              className={`mt-5 rounded-lg border p-3 text-sm ${
                success
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}


          {/* Signup Button */}
          <button
            onClick={handleSignup}
            disabled={loading || success}
            className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>


          {/* Login */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Login
            </a>
          </p>

        </div>

      </div>

    </main>
  );
}