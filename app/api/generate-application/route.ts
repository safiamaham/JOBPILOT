import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------
    // 1. Check API key
    // ---------------------------------------
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY is missing from .env.local",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // 2. Get authorization token
    // ---------------------------------------
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    // ---------------------------------------
    // 3. Create Supabase client
    // ---------------------------------------
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

    // ---------------------------------------
    // 4. Get logged-in user
    // ---------------------------------------
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Your login session is invalid or expired.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------
    // 5. Get application ID
    // ---------------------------------------
    const body = await request.json();

    const applicationId = body.applicationId;

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Application ID is required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // 6. Get user's profile
    // ---------------------------------------
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        name,
        email,
        phone,
        location,
        summary,
        skills,
        linkedin,
        github,
        portfolio,
        cv_path
        `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not load your profile.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete your profile before generating an application.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // 7. Get application/job information
    // ---------------------------------------
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select(
        `
        id,
        job_url,
        job_title,
        company_name,
        location,
        job_description,
        requirements,
        responsibilities
        `
      )
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (applicationError || !application) {
      console.error("Application error:", applicationError);

      return NextResponse.json(
        {
          success: false,
          error: "Job application could not be found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------
    // 8. Download user's private CV
    // ---------------------------------------
    let cvText = "";

    if (profile.cv_path) {
      const { data: cvFile, error: cvError } = await supabase.storage
        .from("cvs")
        .download(profile.cv_path);

      if (cvError || !cvFile) {
        console.error("CV download error:", cvError);

        return NextResponse.json(
          {
            success: false,
            error:
              "Your CV could not be downloaded. Please upload your CV again.",
          },
          { status: 400 }
        );
      }

      const cvBuffer = Buffer.from(await cvFile.arrayBuffer());

      try {
        const parsedPdf = await pdfParse(cvBuffer);
        cvText = parsedPdf.text?.trim() || "";
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);

        return NextResponse.json(
          {
            success: false,
            error:
              "Your CV PDF could not be read. Please upload a text-based PDF.",
          },
          { status: 400 }
        );
      }
    }

    if (!cvText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No readable text was found in your CV. Please upload a text-based PDF.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // 9. Prepare information for AI
    // ---------------------------------------
    const candidateInformation = `
CANDIDATE PROFILE

Name:
${profile.name || ""}

Email:
${profile.email || ""}

Phone:
${profile.phone || ""}

Location:
${profile.location || ""}

Professional Summary:
${profile.summary || ""}

Skills:
${profile.skills || ""}

LinkedIn:
${profile.linkedin || ""}

GitHub:
${profile.github || ""}

Portfolio:
${profile.portfolio || ""}


CV TEXT

${cvText}
`;

    const jobInformation = `
JOB INFORMATION

Job Title:
${application.job_title || ""}

Company:
${application.company_name || ""}

Location:
${application.location || ""}

Job Description:
${application.job_description || ""}

Requirements:
${application.requirements || ""}

Responsibilities:
${application.responsibilities || ""}
`;

    // ---------------------------------------
    // 10. Ask OpenAI to create application
    // ---------------------------------------
    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "system",
          content: `
You are JobPilot AI, a professional job application assistant.

Your task is to create a personalized job application using ONLY the candidate information and job information provided.

Create:

1. A professional personalized application email.
2. A personalized cover letter.

IMPORTANT RULES:

- Never invent qualifications, companies, degrees, certifications, years of experience, achievements, or skills.
- Only mention experience and skills that are actually present in the candidate profile or CV.
- Connect the candidate's real experience to the job requirements when there is a genuine connection.
- Do not claim the candidate meets a requirement if the provided information does not support it.
- Do not mention that AI was used.
- Do not use generic filler.
- Make the writing sound natural and human.
- Keep the email concise and professional.
- The cover letter should normally be around 300-450 words.
- Address the company and role specifically when those details are available.
- Do not use fake placeholders such as [Company Name] if the company name is available.
- Do not include markdown formatting in the email or cover letter.
- Return ONLY valid JSON.
          `,
        },
        {
          role: "user",
          content: `
${candidateInformation}

${jobInformation}

Create the personalized application now.

Return exactly this JSON structure:

{
  "email": "complete application email here",
  "coverLetter": "complete cover letter here"
}
          `,
        },
      ],
    });

    // ---------------------------------------
    // 11. Read AI response
    // ---------------------------------------
    const aiText = response.output_text?.trim();

    if (!aiText) {
      return NextResponse.json(
        {
          success: false,
          error: "AI did not return an application.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // 12. Convert AI JSON into object
    // ---------------------------------------
    let generated;

    try {
      generated = JSON.parse(aiText);
    } catch (parseError) {
      console.error("AI JSON parsing error:", parseError);
      console.error("AI response:", aiText);

      return NextResponse.json(
        {
          success: false,
          error: "AI returned an unexpected response. Please try again.",
        },
        { status: 500 }
      );
    }

    const generatedEmail = generated.email?.trim();
    const generatedCoverLetter = generated.coverLetter?.trim();

    if (!generatedEmail || !generatedCoverLetter) {
      return NextResponse.json(
        {
          success: false,
          error: "AI did not generate both the email and cover letter.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // 13. Save generated application
    // ---------------------------------------
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        generated_email: generatedEmail,
        generated_cover_letter: generatedCoverLetter,
        status: "Generated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Application update error:", updateError);

      return NextResponse.json(
        {
          success: false,
          error: "The AI application was created but could not be saved.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // 14. Return generated application
    // ---------------------------------------
    return NextResponse.json({
      success: true,
      applicationId: application.id,
      email: generatedEmail,
      coverLetter: generatedCoverLetter,
    });
  } catch (error) {
    console.error("Generate application error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the application.",
      },
      { status: 500 }
    );
  }
}