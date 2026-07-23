export const isValidVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/") || clean.startsWith("blob:");
};
