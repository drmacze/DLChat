const devDomain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? `https://${devDomain}`;

export const BASE_URL = apiUrl.replace(/\/$/, "");

export function getApiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
