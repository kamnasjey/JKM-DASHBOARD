/**
 * Timezone Utilities for JKM Dashboard
 * 
 * Golden Rule: 
 * - Backend stores all timestamps in UTC
 * - Frontend displays in Ulaanbaatar time (UTC+8)
 */

/**
 * Format UTC timestamp to Ulaanbaatar time (UTC+8)
 */
export function formatToUBTime(
    utcTimestamp: string | number | Date,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = new Date(utcTimestamp);

    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };

    return date.toLocaleString('en-GB', { ...defaultOptions, ...options });
}

/**
 * Format date only (no time) in Ulaanbaatar timezone
 */
export function formatDateUB(utcTimestamp: string | number | Date): string {
    return formatToUBTime(utcTimestamp, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: undefined,
        minute: undefined,
        second: undefined,
    });
}

/**
 * Format time only (no date) in Ulaanbaatar timezone
 */
export function formatTimeUB(utcTimestamp: string | number | Date): string {
    return formatToUBTime(utcTimestamp, {
        year: undefined,
        month: undefined,
        day: undefined,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/**
 * Format relative time (e.g., "5 minutes ago") with UB context
 */
export function formatRelativeUB(utcTimestamp: string | number | Date): string {
    const date = new Date(utcTimestamp);

    if (isNaN(date.getTime())) {
        return 'Unknown';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return 'Just now'; // Future date edge case
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks}w ago`;

    // Fallback to formatted date for older dates
    return formatDateUB(date);
}

/**
 * Get current time in Ulaanbaatar timezone
 */
export function getCurrentUBTime(): string {
    return formatToUBTime(new Date());
}

/**
 * Check if a timestamp is from today (in UB timezone)
 */
export function isToday(utcTimestamp: string | number | Date): boolean {
    const date = new Date(utcTimestamp);
    const now = new Date();

    const dateUB = formatDateUB(date);
    const todayUB = formatDateUB(now);

    return dateUB === todayUB;
}

/**
 * Parse ISO timestamp and ensure it's in UTC
 */
export function parseUTC(timestamp: string | number | Date): Date {
    const date = new Date(timestamp);
    return date;
}
