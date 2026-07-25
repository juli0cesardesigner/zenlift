export const isValidVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  // Prevent XSS vectors like javascript: or data:text/html
  if (clean.startsWith("javascript:") || clean.startsWith("vbscript:") || clean.startsWith("data:text/html")) {
    return false;
  }
  return clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/") || clean.startsWith("blob:");
};

export const isValidUploadFile = (file?: File, allowedTypes: string[] = []): boolean => {
  if (!file) return false;
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some(type => file.type.startsWith(type));
};

export const formatTime = (ms: number): string => {
  if (!ms || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatRestTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  const cc = centiseconds.toString().padStart(2, "0");
  return `${mm}:${ss}.${cc}`;
};
