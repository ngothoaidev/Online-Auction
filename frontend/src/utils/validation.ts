/**
 * Utility functions for form validation with Zod
 */
import type { z } from 'zod';

/**
 * Validate form data against a Zod schema
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {Object} data - The form data to validate
 * @returns {Object} - { success: boolean, data?: any, errors?: Array, message?: string }
 */
export const validateForm = <S extends z.ZodTypeAny>(schema: S, data: unknown) => {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  // Zod 4 exposes `issues` (older versions `errors`); never leak the raw JSON error string to people.
  const issues = result.error?.issues ?? [];
  const messages = issues.map((i) => i.message);
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path?.[0] as string | undefined;
    if (key !== undefined && fieldErrors[key] === undefined) fieldErrors[key] = i.message;
  }
  return {
    success: false,
    errors: issues,
    messages,
    fieldErrors,
    message: messages.length ? messages.join('\n') : 'Validation failed',
  };
};
