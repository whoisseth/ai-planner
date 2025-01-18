import { headers, type UnsafeUnwrappedHeaders } from "next/headers";

export function getIp() {
  const forwardedFor = (headers() as unknown as UnsafeUnwrappedHeaders).get("x-forwarded-for");
  const realIp = (headers() as unknown as UnsafeUnwrappedHeaders).get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return null;
}
