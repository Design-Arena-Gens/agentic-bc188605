import { NextResponse } from "next/server";

import { publishVideo } from "@/lib/instagram";

interface PublishRequestBody {
  videoUrl?: string;
  caption?: string;
}

export async function POST(request: Request) {
  let body: PublishRequestBody;

  try {
    body = (await request.json()) as PublishRequestBody;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid JSON body received.",
      },
      { status: 400 },
    );
  }

  const videoUrl = body.videoUrl?.trim();
  const caption = body.caption?.trim();

  if (!videoUrl) {
    return NextResponse.json(
      {
        status: "error",
        message: "Provide a publicly accessible videoUrl.",
      },
      { status: 400 },
    );
  }

  if (!caption) {
    return NextResponse.json(
      {
        status: "error",
        message: "Caption cannot be empty.",
      },
      { status: 400 },
    );
  }

  const publishResponse = await publishVideo(videoUrl, caption);

  const statusCode = publishResponse.status === "success" ? 200 : 502;

  return NextResponse.json(publishResponse, { status: statusCode });
}
