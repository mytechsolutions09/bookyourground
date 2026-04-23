export type CalendarCell = {
  iso: string;
  inMonth: boolean;
  dayNum: number;
  date: Date;
};

export function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  // Start from the beginning of the week (Sunday)
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];
  
  for (let i = 0; i < cellCount; i++) {
    if (i < firstWeekday) {
      const day = prevMonthDays - firstWeekday + i + 1;
      const d = new Date(year, month - 1, day);
      cells.push({ iso: formatISODate(d), inMonth: false, dayNum: day, date: d });
    } else if (i < firstWeekday + daysInMonth) {
      const day = i - firstWeekday + 1;
      const d = new Date(year, month, day);
      cells.push({ iso: formatISODate(d), inMonth: true, dayNum: day, date: d });
    } else {
      const day = i - firstWeekday - daysInMonth + 1;
      const d = new Date(year, month + 1, day);
      cells.push({ iso: formatISODate(d), inMonth: false, dayNum: day, date: d });
    }
  }
  return cells;
}
