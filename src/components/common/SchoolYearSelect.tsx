import React from 'react';
import { Calendar } from 'lucide-react';
import { getCurrentSchoolYear, getAvailableSchoolYears } from '../../utils/schoolYear';

interface SchoolYearSelectProps {
  value: string;
  onChange: (year: string) => void;
  requests?: { createdAt: string }[];
  className?: string;
  showAllOption?: boolean;
}

export const SchoolYearSelect: React.FC<SchoolYearSelectProps> = ({
  value,
  onChange,
  requests = [],
  className = '',
  showAllOption = true,
}) => {
  const currentSY = getCurrentSchoolYear();
  const availableYears = getAvailableSchoolYears(requests);

  return (
    <div className={`inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs ${className}`}>
      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">School Year:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
      >
        {availableYears.map((sy) => (
          <option key={sy} value={sy}>
            {sy === currentSY ? `SY ${sy} (Current)` : `SY ${sy}`}
          </option>
        ))}
        {showAllOption && <option value="all">All School Years</option>}
      </select>
    </div>
  );
};
