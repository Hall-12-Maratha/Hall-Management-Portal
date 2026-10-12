/**
 * QR code PNG generation (port of backend/app/services/qr_service.py:
 * error correction M, 10px modules, 4-module quiet zone, auto version).
 */

import QRCode from "qrcode";

export async function generateQrPng(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    type: "png",
    errorCorrectionLevel: "M",
    scale: 10,
    margin: 4,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
