export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const apiUrl = (path: string): string => {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
};
