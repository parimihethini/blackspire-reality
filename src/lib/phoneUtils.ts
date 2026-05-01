/**
 * Normalizes a phone number to E.164 format (+<country_code><number>)
 * Handles Indian numbers without country code automatically.
 */
export const normalizePhone = (phone: string): string => {
    if (!phone) return "";

    // Remove all non-digit and non-plus characters
    let normalized = phone.replace(/[^\d+]/g, "");

    // Handle 10-digit Indian numbers (starting with 6-9)
    if (normalized.length === 10 && /^[6-9]/.test(normalized)) {
        normalized = "+91" + normalized;
    }
    // If it starts with 91 and has 12 digits, convert to +91
    else if (normalized.length === 12 && normalized.startsWith("91")) {
        normalized = "+" + normalized;
    }
    // Ensure it starts with +
    else if (!normalized.startsWith("+")) {
        normalized = "+" + normalized;
    }

    return normalized;
};

/**
 * Validates if the phone number is roughly E.164 compliant (10-15 digits after +)
 */
export const isValidPhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    return /^\+\d{10,15}$/.test(normalized);
};
