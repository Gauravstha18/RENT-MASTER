import NepaliDate from 'nepali-date-converter';
import { Tenant, RentCycle } from '../types';

export function getNepaliDateStr(adDateStr: string): string {
  try {
    const adDate = new Date(adDateStr);
    if (isNaN(adDate.getTime())) return '';
    const nd = new NepaliDate(adDate);
    return nd.format('YYYY-MM-DD');
  } catch (err) {
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
  const diffTime = end.getTime() - currentCycleStart.getTime();
  const daysActiveInCurrentCycle = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const cycleTime = nextCycleStart.getTime() - currentCycleStart.getTime();
  const daysInCurrentCycle = Math.floor(cycleTime / (1000 * 60 * 60 * 24));
  
  // Base due from completed cycles
  const completedCycleDue = fullyCompletedCycles * cycleAmount;
  
  // Prorated amount for current incomplete cycle
  const proratedDue = daysInCurrentCycle > 0 
    ? (daysActiveInCurrentCycle / daysInCurrentCycle) * cycleAmount 
    : 0;

  const totalActiveDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return {
    due: Math.round(completedCycleDue + proratedDue),
    daysActive: totalActiveDays,
    nextDueDate: nextCycleStart.toISOString().slice(0, 10)
  };
}
