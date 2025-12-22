/**
 * Formats time in seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string (MM:SS)
 */
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * Clamps a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Calculates progress percentage
 * @param current - Current position
 * @param total - Total duration
 * @returns Progress percentage (0-1)
 */
export const calculateProgress = (current: number, total: number): number => {
  if (!total || total <= 0) return 0;
  return clamp(current / total, 0, 1);
};
