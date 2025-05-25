declare module 'react-calendar' {
  import { ComponentType, ReactNode } from 'react';

  export interface CalendarProps {
    onChange?: (date: Date | Date[]) => void;
    value?: Date | Date[] | null;
    activeStartDate?: Date;
    calendarType?: 'ISO 8601' | 'US' | 'Arabic' | 'Hebrew';
    className?: string;
    defaultActiveStartDate?: Date;
    defaultValue?: Date | Date[];
    defaultView?: 'month' | 'year' | 'decade' | 'century';
    formatDay?: (locale: string, date: Date) => string;
    formatLongDate?: (locale: string, date: Date) => string;
    formatMonth?: (locale: string, date: Date) => string;
    formatMonthYear?: (locale: string, date: Date) => string;
    formatShortWeekday?: (locale: string, date: Date) => string;
    formatWeekday?: (locale: string, date: Date) => string;
    formatYear?: (locale: string, date: Date) => string;
    locale?: string;
    maxDate?: Date;
    maxDetail?: 'month' | 'year' | 'decade' | 'century';
    minDate?: Date;
    minDetail?: 'month' | 'year' | 'decade' | 'century';
    navigationLabel?: (
      { date, view, label }: { date: Date; view: string; label: string }
    ) => string | ReactNode;
    next2Label?: string | ReactNode;
    nextLabel?: string | ReactNode;
    onActiveStartDateChange?: ({
      activeStartDate,
      view,
    }: {
      activeStartDate: Date;
      view: string;
    }) => void;
    onClickDay?: (date: Date, event: React.MouseEvent<HTMLButtonElement>) => void;
    onClickDecade?: (date: Date, event: React.MouseEvent<HTMLButtonElement>) => void;
    onClickMonth?: (date: Date, event: React.MouseEvent<HTMLButtonElement>) => void;
    onClickWeekNumber?: (weekNumber: number, date: Date, event: React.MouseEvent<HTMLButtonElement>) => void;
    onClickYear?: (date: Date, event: React.MouseEvent<HTMLButtonElement>) => void;
    onDrillDown?: ({ activeStartDate, view }: { activeStartDate: Date; view: string }) => void;
    onDrillUp?: ({ activeStartDate, view }: { activeStartDate: Date; view: string }) => void;
    onViewChange?: ({ activeStartDate, view }: { activeStartDate: Date; view: string }) => void;
    prev2Label?: string | ReactNode;
    prevLabel?: string | ReactNode;
    returnValue?: 'start' | 'end' | 'range';
    selectRange?: boolean;
    showFixedNumberOfWeeks?: boolean;
    showNavigation?: boolean;
    showNeighboringMonth?: boolean;
    showWeekNumbers?: boolean;
    tileClassName?: string | string[] | ((props: { date: Date; view: string }) => string | string[] | null);
    tileContent?: string | ReactNode | ((props: { date: Date; view: string }) => string | ReactNode);
    tileDisabled?: (props: { activeStartDate: Date; date: Date; view: string }) => boolean;
    view?: 'month' | 'year' | 'decade' | 'century';
  }

  const Calendar: ComponentType<CalendarProps>;
  export default Calendar;
}