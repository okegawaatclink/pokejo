import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const endpoint = req.nextUrl.searchParams.get("url")?.trim();
  let url = "";

  if (endpoint) {
    if (!/^https?:\/\//i.test(endpoint)) {
      return NextResponse.json(
        { error: "url must be an absolute http(s) endpoint" },
        { status: 400 }
      );
    }
    url = endpoint;
  }

  if (!url) {
    const token = req.nextUrl.searchParams.get("token");
    const target = req.nextUrl.searchParams.get("target") || "store";
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    if (target !== "store" && target !== "cast") {
      return NextResponse.json({ error: "target is invalid" }, { status: 400 });
    }

    url = `${req.nextUrl.origin}/${target}/${token}`;
  }

  const darkColor = req.nextUrl.searchParams.get("dark") || "#0f172a";
  if (!/^#[0-9a-f]{6}$/i.test(darkColor)) {
    return NextResponse.json({ error: "dark color is invalid" }, { status: 400 });
  }

  const buffer = await QRCode.toBuffer(url, {
    width: 320,
    margin: 2,
    color: { dark: darkColor, light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
