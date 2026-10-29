/**
 * Utility functions for form validation with Zod
 */

/**
 * Validate form data against a Zod schema
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {Object} data - The form data to validate
 * @returns {Object} - { success: boolean, data?: any, errors?: Array, message?: string }
 */
export const validateForm = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  // Zod 4 exposes `issues` (older versions `errors`); never leak the raw JSON error string to people.
  const issues = result.error?.issues ?? result.error?.errors ?? [];
  const messages = issues.map((i) => i.message);
  const fieldErrors = {};
  for (const i of issues) {
    const key = i.path?.[0];
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

/**
 * Validate a single field
 * @param {ZodSchema} schema - The Zod schema
 * @param {string} fieldName - The field name to validate
 * @param {any} value - The field value
 * @returns {Object} - { success: boolean, error?: string }
 */
export const validateField = (schema, fieldName, value) => {
  try {
    // Create a partial object with just this field
    const fieldSchema = schema.shape[fieldName];
    if (!fieldSchema) {
      return { success: true };
    }
    
    fieldSchema.parse(value);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.errors?.[0]?.message || 'Invalid value',
    };
  }
};

/**
 * Get first error message from validation result
 * @param {Object} errors - Errors object from validateForm
 * @returns {string} - First error message
 */
export const getFirstError = (errors) => {
  if (!errors) return '';
  const firstKey = Object.keys(errors)[0];
  return errors[firstKey] || '';
};

/**
 * Check if form has any errors
 * @param {Object} errors - Errors object
 * @returns {boolean}
 */
export const hasErrors = (errors) => {
  return errors && Object.keys(errors).length > 0;
};
