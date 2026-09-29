import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type RequestBody = {
  jobUrl?: string;
  jobText?: string;
};

function cleanText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSection(
  text: string,
  headings: string[]
): string {
  const lines = text.split("\n");

  const headingIndex = lines.findIndex((line) => {
    const normalized = line
      .trim()
      .toLowerCase()
      .replace(/[:\-]+$/, "");

    return headings.some(
      (heading) =>
        normalized === heading.toLowerCase()
    );
  });

  if (headingIndex === -1) {
    return "";
  }

  const collected: string[] = [];

  for (
    let i = headingIndex + 1;
    i < lines.length;
    i++
  ) {
    const currentLine = lines[i].trim();

    if (!currentLine) {
      continue;
    }

    const normalized = currentLine
      .toLowerCase()
      .replace(/[:\-]+$/, "");

    const isAnotherHeading = [
      "about the job",
      "about us",
      "responsibilities",
      "responsibilities & duties",
      "requirements",
      "qualifications",
      "skills",
      "what you'll do",
      "what you will do",
      "what we're looking for",
      "what we are looking for",
      "preferred qualifications",
      "education",
      "experience",
      "benefits",
      "location",
      "salary",
    ].some(
      (heading) =>
        normalized === heading.toLowerCase()
    );

    if (isAnotherHeading) {
      break;
    }

    collected.push(currentLine);
  }

  return collected.join("\n").trim();
}

function extractTitle(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const commonLabels = [
    "about the job",
    "job description",
    "description",
    "responsibilities",
    "requirements",
    "qualifications",
    "skills",
    "apply",
    "easy apply",
  ];

  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase();

    if (
      line.length >= 3 &&
      line.length <= 120 &&
      !commonLabels.includes(lower) &&
      !lower.includes("linkedin")
    ) {
      return line;
    }
  }

  return "LinkedIn Job";
}

function extractCompany(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const companyPatterns = [
    /^company\s*[:\-]\s*(.+)$/i,
    /^company name\s*[:\-]\s*(.+)$/i,
  ];

  for (const line of lines) {
    for (const pattern of companyPatterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return null;
}

function extractLocation(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const locationPatterns = [
    /^location\s*[:\-]\s*(.+)$/i,
    /^job location\s*[:\-]\s*(.+)$/i,
  ];

  for (const line of lines) {
    for (const pattern of locationPatterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return null;
}

function extractResponsibilities(text: string): string {
  return extractSection(text, [
    "responsibilities",
    "responsibilities & duties",
    "what you'll do",
    "what you will do",
    "duties",
  ]);
}

function extractRequirements(text: string): string {
  return extractSection(text, [
    "requirements",
    "qualifications",
    "skills",
    "what we're looking for",
    "what we are looking for",
    "preferred qualifications",
  ]);
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as RequestBody;

    const jobUrl = body.jobUrl?.trim();
    const jobText = body.jobText?.trim();

    if (!jobUrl) {
      return NextResponse.json(
        {
          error: "LinkedIn job URL is required.",
        },
        { status: 400 }
      );
    }

    if (!jobText) {
      return NextResponse.json(
        {
          error:
            "Please provide the LinkedIn job details.",
        },
        { status: 400 }
      );
    }

    if (
      !jobUrl
        .toLowerCase()
        .includes("linkedin.com/jobs/")
    ) {
      return NextResponse.json(
        {
          error:
            "This route is only for LinkedIn job URLs.",
        },
        { status: 400 }
      );
    }

    if (jobText.length < 50) {
      return NextResponse.json(
        {
          error:
            "The job details are too short. Please copy more of the LinkedIn job description.",
        },
        { status: 400 }
      );
    }

    /*
     * Get the user's Supabase access token.
     */
    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error: "Authorization is required.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Invalid authorization token.",
        },
        { status: 401 }
      );
    }

    /*
     * Create a Supabase client using the user's
     * access token.
     */
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    /*
     * Verify the logged-in user.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    /*
     * Clean the text supplied by the user.
     */
    const cleanedText = cleanText(jobText);

    /*
     * Try to identify basic job information.
     */
    const title = extractTitle(cleanedText);

    const companyName =
      extractCompany(cleanedText);

    const location =
      extractLocation(cleanedText);

    const responsibilities =
      extractResponsibilities(cleanedText);

    const requirements =
      extractRequirements(cleanedText);

    /*
     * If specific sections were found, use them.
     * Otherwise keep the complete job text as the description.
     */
    const description = cleanedText;

    /*
     * Save the application to Supabase.
     */
    const { data: application, error: insertError } =
      await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          job_url: jobUrl,
          job_title: title,
          company_name: companyName,
          location,
          job_description: description,
          requirements,
          responsibilities,
          status: "Analyzed",
        })
        .select(
          "id, job_url, job_title, company_name, location, job_description, requirements, responsibilities, status"
        )
        .single();

    if (insertError) {
      console.error(
        "Supabase application insert error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save the job application.",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      job: {
        title,
        companyName,
        location,
        description,
        requirements,
        responsibilities,
      },

      application,
    });
  } catch (error) {
    console.error(
      "Create LinkedIn application error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while preparing the LinkedIn application.",
      },
      { status: 500 }
    );
  }
}