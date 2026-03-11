declare module "holiday-jp" {
  export interface Holiday {
    name: string;
  }

  export function isHoliday(date: Date): Holiday | null;
}
