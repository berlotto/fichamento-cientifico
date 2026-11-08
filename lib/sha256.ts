/** SHA-256 em hex (Web Crypto: browser e Node). */
export async function sha256Hex(data: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const pdfStoragePath = (userId: string, sha256: string) => `${userId}/${sha256}.pdf`;
