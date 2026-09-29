import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function cleanText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function removeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string) {
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] || "";

  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";

  return cleanText(ogTitle || title);
}

function extractMetaDescription(html: string) {
  const description =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    )?.[1] || "";

  return cleanText(description);
}

function extractSection(text: string, headings: string[]) {
  for (const heading of headings) {
    const regex = new RegExp(
      `${heading}\\s*[:\\-]?\\s*([\\s\\S]{0,3000})`,
      "i"
    );

    const match = text.match(regex);

    if (match?.[1]) {
      return cleanText(match[1]).slice(0, 3000);
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Job URL is required." },
        { status: 400 }
      );
    }

    url = url.trim();

    // Handle Markdown-style URLs
    const markdownMatch = url.match(
      /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/
    );

    if (markdownMatch) {
      url = markdownMatch[2];
    }

    let jobUrl: URL;

    try {
      jobUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          error:
            "Please enter a valid job URL, for example https://example.com",
        },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(jobUrl.protocol)) {
      return NextResponse.json(
        {
          error: "Only HTTP and HTTPS URLs are allowed.",
        },
        { status: 400 }
      );
    }

    console.log("Fetching job URL:", jobUrl.toString());

    const response = await fetch(jobUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });

    console.log("Website response:", response.status);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `The job website returned HTTP ${response.status}.`,
        },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error: "The provided URL did not return an HTML webpage.",
        },
        { status: 400 }
      );
    }

    const html = await response.text();

    if (!html.trim()) {
      return NextResponse.json(
        {
          error: "The job webpage returned empty content.",
        },
        { status: 400 }
      );
    }

    // Convert webpage HTML into readable text
    const pageText = removeHtml(html);

    // Extract basic information
    const jobTitle = extractTitle(html);

    const metaDescription = extractMetaDescription(html);

    const requirements = extractSection(pageText, [
      "Requirements",
      "Requirements and Qualifications",
      "Qualifications",
      "What we're looking for",
      "What we are looking for",
      "Skills",
    ]);

    const responsibilities = extractSection(pageText, [
      "Responsibilities",
      "Key Responsibilities",
      "What you'll do",
      "What you will do",
      "Duties",
    ]);

    const jobDescription =
      metaDescription ||
      pageText.slice(0, 5000);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // Get logged-in user
    const authHeader = request.headers.get("authorization");

    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      userId = user?.id || null;
    }

    /*
      If the browser doesn't send the token yet,
      we still return the extracted job information.
    */

    let application = null;

    if (userId) {
      const { data, error } = await supabase
        .from("applications")
        .insert({
          user_id: userId,
          job_url: jobUrl.toString(),
          job_title: jobTitle || null,
          company_name: null,
          location: null,
          job_description: jobDescription || null,
          requirements: requirements || null,
          responsibilities: responsibilities || null,
          status: "Analyzed",
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase application error:", error);
      } else {
        application = data;
      }
    }

    return NextResponse.json({
      success: true,

      job: {
        title: jobTitle || "Job Title Not Found",
        companyName: null,
        location: null,
        description: jobDescription,
        requirements:
          requirements || "Requirements not automatically detected.",
        responsibilities:
          responsibilities ||
          "Responsibilities not automatically detected.",
      },

      application,

      url: jobUrl.toString(),
    });
  } catch (error) {
    console.error("JOB ANALYSIS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to analyze the job: ${error.message}`
            : "Unable to analyze the job.",
      },
      { status: 500 }
    );
  }
}