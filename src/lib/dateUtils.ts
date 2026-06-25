import NepaliDateRaw from 'nepali-date-converter';
import { Tenant, RentCycle, Payment } from '../types';

export function getNepaliDateStr(adDateStr: string): string {
  try {
    const adDate = new Date(adDateStr);
    if (isNaN(adDate.getTime())) return '';
    
    const NepaliDateConstructor: any = (NepaliDateRaw as any).default || NepaliDateRaw;
    if (typeof NepaliDateConstructor === 'function') {
      const nd = new NepaliDateConstructor(adDate);
      return nd.format('YYYY-MM-DD');
    }
    return '';
  } catch (err) {
    console.warn('[DateUtils] Nepali Date conversion error:', err);
    return '';
  }
}

export function formatWithNepaliDate(adDateStr: string): string {
  if (!adDateStr) return '';
  const bs = getNepaliDateStr(adDateStr);
  if (!bs) return adDateStr;
  return `${adDateStr} (BS: ${bs})`;
}

export function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getNextCycleDate(startDate: string, cycle: RentCycle = 'monthly'): string {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return startDate;
  
  if (cycle === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (cycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (cycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

export function calculateProRatedAmount(
  startDate: string, 
  endDate: string, 
  cycleAmount: number, 
  cycle: RentCycle = 'monthly'
): { due: number; daysActive: number; nextDueDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { due: 0, daysActive: 0, nextDueDate: startDate };
  }

  const daysBetween = (d1: Date, d2: Date) => {
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  };

  // Find the most recent cycle start date before or on 'end'
  let currentCycleStart = new Date(start);
  let nextCycleStart = new Date(getNextCycleDate(currentCycleStart.toISOString().slice(0, 10), cycle));
  
  let fullyCompletedCycles = 0;
  
  // Advance cycle by cycle until nextCycleStart is strictly after end date
  while (nextCycleStart <= end) {
    fullyCompletedCycles++;
    currentCycleStart = new Date(nextCycleStart);
    nextCycleStart = new Date(getNextCycleDate(currentCycleStart.toISOString().slice(0, 10), cycle));
  }

  // Calculate days passed in the *current* incomplete cycle
  const daysActiveInCurrentCycle = daysBetween(currentCycleStart, end);
  const daysInCurrentCycle = daysBetween(currentCycleStart, nextCycleStart);
  
  // Base due from completed cycles
  const completedCycleDue = fullyCompletedCycles * cycleAmount;
  
  // Prorated amount for current incomplete cycle
  const proratedDue = daysInCurrentCycle > 0 
    ? (daysActiveInCurrentCycle / daysInCurrentCycle) * cycleAmount 
    : 0;

  const totalActiveDays = daysBetween(start, end);

  return {
    due: Math.round(completedCycleDue + proratedDue),
    daysActive: totalActiveDays,
    nextDueDate: nextCycleStart.toISOString().slice(0, 10)
  };
}

export interface RentDueResult {
  dueDate: string;
  isOverdue: boolean;
  daysDiff: number;
  inlineStyleClass: string;
  displayText: string;
}

function getOverdueBreakdown(activeDueDate: Date, refDate: Date): string {
  let years = refDate.getFullYear() - activeDueDate.getFullYear();
  let months = refDate.getMonth() - activeDueDate.getMonth();
  let days = refDate.getDate() - activeDueDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(`${months} Month${months > 1 ? 's' : ''}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

export function getRentDueInfo(
  tenant: Tenant,
  paymentsList: Payment[],
  referenceDateStr: string = getTodayDateStr()
): RentDueResult | null {
  if (!tenant.startDate) return null;

  const start = new Date(tenant.startDate);
  const ref = new Date(referenceDateStr);
  if (isNaN(start.getTime()) || isNaN(ref.getTime())) return null;

  const daysBetweenDates = (d1: Date, d2: Date) => {
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  };

  const cycle = tenant.rentCycle || 'monthly';
  const type = tenant.rentCollectionType || 'arrears';

  // For "arrears" (the default), the first due date is after the month/cycle is completed.
  // For "advance", the first due date is immediately upon joining (the start date).
  let initialDueStr = tenant.startDate;
  if (type === 'arrears') {
    initialDueStr = getNextCycleDate(tenant.startDate, cycle);
  }

  let due = new Date(initialDueStr);

  if (due > ref) {
    const days = daysBetweenDates(ref, due);
    return {
      dueDate: initialDueStr,
      isOverdue: false,
      daysDiff: days,
      inlineStyleClass: "text-emerald-600 font-bold",
      displayText: `Due in ${days} day${days > 1 ? 's' : ''} (${initialDueStr})`
    };
  }

  // Iterate and find active due date based on paid payments count
  const paidPaymentsCount = paymentsList.filter(
    p => p.tenantId === tenant.id && p.status === 'paid'
  ).length;

  let activeDueDateStr = initialDueStr;
  if (paidPaymentsCount > 0) {
    let tempDueStr = initialDueStr;
    for (let i = 0; i < paidPaymentsCount; i++) {
      tempDueStr = getNextCycleDate(tempDueStr, cycle);
    }
    activeDueDateStr = tempDueStr;
  }

  const activeDueDate = new Date(activeDueDateStr);
  const daysDiff = daysBetweenDates(activeDueDate, ref);

  if (daysDiff > 0) {
    const breakdownText = getOverdueBreakdown(activeDueDate, ref);
    return {
      dueDate: activeDueDateStr,
      isOverdue: true,
      daysDiff,
      inlineStyleClass: "text-rose-600 font-bold font-mono",
      displayText: `OVERDUE by ${breakdownText} (Due: ${activeDueDateStr})`
    };
  } else {
    const upcomingDiff = daysBetweenDates(ref, activeDueDate);
    return {
      dueDate: activeDueDateStr,
      isOverdue: false,
      daysDiff: upcomingDiff,
      inlineStyleClass: "text-emerald-600 font-bold",
      displayText: upcomingDiff === 0 
        ? `Due Today (${activeDueDateStr})` 
        : `Due in ${upcomingDiff} day${upcomingDiff > 1 ? 's' : ''} (${activeDueDateStr})`
    };
  }
}
