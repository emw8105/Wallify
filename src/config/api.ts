export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://gwpxd7r66j.execute-api.us-east-2.amazonaws.com";

export const apiUrl = (path: string): string => {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
