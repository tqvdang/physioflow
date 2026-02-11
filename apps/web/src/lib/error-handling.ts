/**
 * Error handling utilities for API mutations.
 * Maps API errors to user-friendly toast messages.
 */

import { toast } from "sonner";
import { ApiError } from "@/lib/api";

/**
 * Display user-friendly toast messages based on the error type.
 * Handles ApiError status codes as well as network and generic errors.
 */
export function showMutationError(error: unknown): void {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        toast.error("This record was modified by another user. Please refresh.");
        break;
      case 404:
        toast.error("Record not found. It may have been deleted.");
        break;
      case 422:
        toast.error(error.message || "Validation error. Please check your input.");
        break;
      case 500:
      case 502:
      case 503:
        toast.error("Server error. Please try again later.");
        break;
      default:
        toast.error(error.message || "An error occurred. Please try again.");
    }
  } else if (error instanceof TypeError && error.message === "Failed to fetch") {
    toast.error("No internet connection. Please try again.");
  } else {
    toast.error("An unexpected error occurred. Please try again.");
  }
}
