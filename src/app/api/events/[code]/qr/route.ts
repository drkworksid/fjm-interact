import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host;
    const protocol = req.headers.get("x-forwarded-proto") || (url.protocol.startsWith("https") ? "https" : "http");
    
    // Join URL for participant
    const joinUrl = `${protocol}://${host}/${code}`;

    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      success: true,
      joinUrl,
      qrDataUrl,
      code,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

