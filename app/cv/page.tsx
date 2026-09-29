"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function CVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [currentCV, setCurrentCV] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCurrentCV();
  }, []);

  const loadCurrentCV = async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be logged in to manage your CV.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("cv_path")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data?.cv_path) {
      setCurrentCV(data.cv_path);
    }

    setLoading(false);
  };

  const handleUpload = async () => {
    setMessage("");
    setErrorMessage("");

    if (!file) {
      setErrorMessage("Please select a PDF CV first.");
      return;
    }

    if (file.type !== "application/pdf") {
      setErrorMessage("Only PDF files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Your CV must be smaller than 10 MB.");
      return;
    }

    setUploading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be logged in to upload your CV.");
      setUploading(false);
      return;
    }

    const filePath = `${user.id}/cv.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(filePath, file, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        cv_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (profileError) {
      setErrorMessage(profileError.message);
      setUploading(false);
      return;
    }

    setCurrentCV(filePath);
    setMessage("CV uploaded successfully.");
    setFile(null);
    setUploading(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading CV section...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Upload Your CV
          </h1>

          <p className="mt-2 text-gray-500">
            Upload your CV so JobPilot AI can use your experience when
            creating personalized job applications.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-4xl">📄</div>

            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Choose your CV
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              PDF only • Maximum 10 MB
            </p>

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;
                setFile(selectedFile);
                setMessage("");
                setErrorMessage("");
              }}
              className="mt-6 block w-full text-sm text-gray-600"
            />

            {file && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                Selected: <strong>{file.name}</strong>
              </div>
            )}
          </div>

          {currentCV && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">
                You already have a CV uploaded.
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Uploading another CV will replace your current CV.
              </p>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading CV..." : "Upload CV"}
          </button>
        </div>
      </div>
    </main>
  );
}