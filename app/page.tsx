"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type JobData = {
  title: string;
  companyName: string | null;
  location: string | null;
  description: string;
  requirements: string;
  responsibilities: string;
};

export default function Home() {
  const [jobUrl, setJobUrl] = useState("");
  const [linkedinJobText, setLinkedinJobText] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [analysisMessage, setAnalysisMessage] = useState("");

  const [job, setJob] = useState<JobData | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);

  const [generatedEmail, setGeneratedEmail] = useState("");
  const [generatedCoverLetter, setGeneratedCoverLetter] =
    useState("");

  const isLinkedInJob =
    jobUrl.toLowerCase().includes("linkedin.com/jobs/");

  const handleOpenLinkedIn = () => {
    if (!jobUrl.trim()) {
      setAnalysisMessage("Please paste a LinkedIn job URL first.");
      return;
    }

    window.open(jobUrl.trim(), "_blank", "noopener,noreferrer");
  };

  const handleAnalyzeJob = async () => {
    setAnalysisMessage("");
    setJob(null);
    setApplicationId(null);
    setGeneratedEmail("");
    setGeneratedCoverLetter("");

    if (!jobUrl.trim()) {
      setAnalysisMessage("Please paste a job URL first.");
      return;
    }

    /*
     * LinkedIn jobs are handled differently.
     *
     * We do not try to scrape a private/logged-in LinkedIn
     * page from our server.
     */
    if (isLinkedInJob) {
      setAnalysisMessage(
        "LinkedIn job detected. Open the job on LinkedIn, copy the job details, and paste them below."
      );
      return;
    }

    setAnalyzing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAnalysisMessage("Please log in before analyzing a job.");
        return;
      }

      const response = await fetch("/api/analyze-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: jobUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnalysisMessage(
          data.error || "Unable to analyze this job."
        );
        return;
      }

      console.log("Job analysis result:", data);

      setJob(data.job || null);

      if (data.application?.id) {
        setApplicationId(data.application.id);
      }

      setAnalysisMessage("Job analyzed successfully.");
    } catch (error) {
      console.error("Analyze job error:", error);

      setAnalysisMessage(
        "Something went wrong while analyzing the job."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateLinkedInApplication = async () => {
    setAnalysisMessage("");

    if (!linkedinJobText.trim()) {
      setAnalysisMessage(
        "Please paste the LinkedIn job description/details first."
      );
      return;
    }

    setAnalyzing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAnalysisMessage(
          "Please log in before preparing an application."
        );
        return;
      }

      /*
       * We send the job information to our own API.
       * No LinkedIn password or LinkedIn cookie is sent.
       */
      const response = await fetch(
        "/api/create-linkedin-application",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            jobUrl: jobUrl.trim(),
            jobText: linkedinJobText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setAnalysisMessage(
          data.error ||
            "Unable to prepare the LinkedIn application."
        );
        return;
      }

      setJob(data.job || null);

      if (data.application?.id) {
        setApplicationId(data.application.id);
      }

      setAnalysisMessage(
        "LinkedIn job information saved successfully. You can now generate your personalized application."
      );
    } catch (error) {
      console.error(
        "LinkedIn application error:",
        error
      );

      setAnalysisMessage(
        "Something went wrong while preparing the LinkedIn application."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateApplication = async () => {
    setAnalysisMessage("");

    if (!applicationId) {
      setAnalysisMessage(
        "Application record was not created yet."
      );
      return;
    }

    setGenerating(true);
    setGeneratedEmail("");
    setGeneratedCoverLetter("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAnalysisMessage(
          "Please log in before generating your application."
        );
        return;
      }

      const response = await fetch(
        "/api/generate-application",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            applicationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setAnalysisMessage(
          data.error ||
            "Unable to generate your application."
        );
        return;
      }

      console.log(
        "Generated application:",
        data
      );

      setGeneratedEmail(data.email || "");

      setGeneratedCoverLetter(
        data.coverLetter || ""
      );

      setAnalysisMessage(
        "Your personalized application has been generated successfully."
      );
    } catch (error) {
      console.error(
        "Generate application error:",
        error
      );

      setAnalysisMessage(
        "Something went wrong while generating your application."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              JobPilot AI
            </h1>

            <p className="text-sm text-gray-500">
              AI-powered job applications
            </p>
          </div>

          <button className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900">
            Apply to jobs smarter
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Paste a job posting and let AI prepare a
            personalized application using your profile and CV.
          </p>
        </div>

        {/* URL Input */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Job posting URL
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => {
                setJobUrl(e.target.value);
                setAnalysisMessage("");
                setJob(null);
                setApplicationId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAnalyzeJob();
                }
              }}
              placeholder="https://www.linkedin.com/jobs/view/..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={handleAnalyzeJob}
              disabled={analyzing || generating}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing
                ? "Preparing..."
                : isLinkedInJob
                ? "Use LinkedIn Job"
                : "Analyze Job"}
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            For LinkedIn jobs, JobPilot will open the job in
            your browser and use the job information you provide.
          </p>

          {analysisMessage && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              {analysisMessage}
            </div>
          )}
        </div>

        {/* LinkedIn Job Workflow */}
        {isLinkedInJob && !job && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl">
                in
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  LinkedIn Job Detected
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  LinkedIn may require your own logged-in browser
                  session, so JobPilot will not ask for or store
                  your LinkedIn password.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleOpenLinkedIn}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Open Job on LinkedIn ↗
              </button>

              <button
                onClick={() => {
                  document
                    .getElementById("linkedin-job-details")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Paste Job Details
              </button>
            </div>

            <div
              id="linkedin-job-details"
              className="mt-8 border-t pt-6"
            >
              <h4 className="text-lg font-semibold text-gray-900">
                LinkedIn Job Details
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Open the job above, copy the visible job
                description/details, and paste them here.
              </p>

              <textarea
                value={linkedinJobText}
                onChange={(e) =>
                  setLinkedinJobText(e.target.value)
                }
                placeholder="Paste the LinkedIn job description here...

Example:
Job title
Company
Location
About the job
Responsibilities
Requirements
Qualifications
Skills
Experience
Salary, if shown"
                rows={16}
                className="mt-4 w-full rounded-xl border border-gray-300 p-4 text-sm leading-6 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                onClick={handleCreateLinkedInApplication}
                disabled={
                  analyzing ||
                  generating ||
                  !linkedinJobText.trim()
                }
                className="mt-4 w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing
                  ? "Saving Job..."
                  : "Analyze & Prepare Application"}
              </button>
            </div>
          </div>
        )}

        {/* Job Analysis */}
        {job && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Job Analysis
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-900">
                  {job.title || "Job Title Not Found"}
                </h3>
              </div>

              <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Ready
              </div>
            </div>

            {/* Company and Location */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Company"
                value={
                  job.companyName || "Not detected"
                }
              />

              <InfoCard
                label="Location"
                value={
                  job.location || "Not detected"
                }
              />
            </div>

            {/* Description */}
            <JobSection
              title="Job Description"
              content={
                job.description ||
                "No job description was provided."
              }
            />

            {/* Requirements */}
            <JobSection
              title="Requirements"
              content={
                job.requirements ||
                "No specific requirements were provided."
              }
            />

            {/* Responsibilities */}
            <JobSection
              title="Responsibilities"
              content={
                job.responsibilities ||
                "No specific responsibilities were provided."
              }
            />

            {/* Generate Button */}
            <div className="mt-8 border-t pt-6">
              <button
                onClick={handleGenerateApplication}
                disabled={
                  generating || !applicationId
                }
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating
                  ? "AI is creating your application..."
                  : "Generate Personalized Application"}
              </button>

              <p className="mt-3 text-center text-sm text-gray-500">
                AI will use your profile, CV, and this job
                posting to create your application.
              </p>
            </div>
          </div>
        )}

        {/* Generated Application */}
        {(generatedEmail || generatedCoverLetter) && (
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            {/* Success Header */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                  ✓
                </div>

                <div>
                  <h3 className="font-bold text-green-900">
                    Application Generated
                  </h3>

                  <p className="text-sm text-green-700">
                    Your application is ready for review.
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            {generatedEmail && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Application Email
                  </h3>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    AI Generated
                  </span>
                </div>

                <textarea
                  value={generatedEmail}
                  onChange={(e) =>
                    setGeneratedEmail(e.target.value)
                  }
                  rows={10}
                  className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-6 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* Cover Letter */}
            {generatedCoverLetter && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Cover Letter
                  </h3>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    AI Generated
                  </span>
                </div>

                <textarea
                  value={generatedCoverLetter}
                  onChange={(e) =>
                    setGeneratedCoverLetter(
                      e.target.value
                    )
                  }
                  rows={18}
                  className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-6 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* LinkedIn Review */}
            {isLinkedInJob && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
                <h3 className="text-lg font-bold text-blue-900">
                  Ready for LinkedIn
                </h3>

                <p className="mt-2 text-sm text-blue-700">
                  Review your generated application, then open
                  the LinkedIn job in your normal browser session
                  to complete the application.
                </p>

                <button
                  onClick={handleOpenLinkedIn}
                  className="mt-5 rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Review Job on LinkedIn ↗
                </button>
              </div>
            )}

            {/* Normal Job Send Placeholder */}
            {!isLinkedInJob && (
              <div className="rounded-2xl border bg-white p-6 text-center">
                <button
                  disabled
                  className="rounded-lg bg-gray-300 px-8 py-3 font-semibold text-gray-600"
                >
                  Send Application
                </button>

                <p className="mt-3 text-xs text-gray-500">
                  Sending will be connected in a future step.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Applications"
            value="0"
          />

          <StatCard
            title="Interviews"
            value="0"
          />

          <StatCard
            title="Offers"
            value="0"
          />
        </div>

        {/* Getting Started */}
        <div className="mt-10 rounded-2xl border bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Getting Started
          </h3>

          <div className="mt-5 space-y-4">
            <Step
              number="1"
              title="Add your profile"
              description="Add your experience, skills, education, and contact information."
            />

            <Step
              number="2"
              title="Upload your CV"
              description="Upload your current CV so AI can understand your experience."
            />

            <Step
              number="3"
              title="Paste a job URL"
              description="For LinkedIn, open the job and paste its visible details into JobPilot."
            />

            <Step
              number="4"
              title="Generate your application"
              description="Create a personalized email and cover letter."
            />

            <Step
              number="5"
              title="Review on LinkedIn"
              description="Open LinkedIn, review the application, and submit it yourself."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}

function JobSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold text-gray-900">
        {title}
      </h4>

      <div className="mt-2 rounded-xl bg-gray-50 p-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {content}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
        {number}
      </div>

      <div>
        <h4 className="font-medium text-gray-900">
          {title}
        </h4>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}