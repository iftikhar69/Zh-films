import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clampPage(page: number, max: number) {
  if (Number.isNaN(page) || page < 1) return 1;
  return Math.min(page, Math.max(1, max));
}
