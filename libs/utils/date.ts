// parse date to "YYYY,MM/DD" format
export function formatDateToYMD(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are zero-based
    const day = date.getDate();

    return `${year},${month}/${day}`;
}

// get current year
export function getCurrentYear(): number {
    return new Date().getFullYear();
}

// get current month
export function getCurrentMonth(): number {
    return new Date().getMonth() + 1; // Months are zero-based
}