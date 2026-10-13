export function getSchoolYearForDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return '2026-2027';
  }
  const year = d.getFullYear();
  // US K-12 Academic School Year starts July 1st (month index 6)
  if (d.getMonth() >= 6) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

export function getCurrentSchoolYear(settings?: { currentSchoolYear?: string }): string {
  if (settings?.currentSchoolYear) {
    return settings.currentSchoolYear;
  }
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('pef_current_school_year');
    if (stored) return stored;
  }
  // Local system simulated date is August 2026
  const now = new Date();
  const currentYear = now.getFullYear();
  if (currentYear < 2026) {
    return '2026-2027';
  }
  return getSchoolYearForDate(now);
}

export function getAvailableSchoolYears(requests: { createdAt: string }[], settings?: { currentSchoolYear?: string }): string[] {
  const currentSY = getCurrentSchoolYear(settings);
  const yearsSet = new Set<string>();
  yearsSet.add(currentSY);

  requests.forEach((r) => {
    if (r.createdAt) {
      yearsSet.add(getSchoolYearForDate(r.createdAt));
    }
  });

  // Sort descending (e.g., 2026-2027, 2025-2026, 2024-2025)
  return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
}

export function getUpcomingSchoolYears(settings?: { currentSchoolYear?: string }): string[] {
  const currentSY = getCurrentSchoolYear(settings);
  const startYear = parseInt(currentSY.split('-')[0], 10) || 2026;
  return [
    `${startYear - 1}-${startYear}`,
    `${startYear}-${startYear + 1}`,
    `${startYear + 1}-${startYear + 2}`,
    `${startYear + 2}-${startYear + 3}`,
  ];
}
