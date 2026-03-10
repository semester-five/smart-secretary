"use no memo";

import type { ColumnDef } from "@tanstack/react-table";

export function withCheckboxColumn<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  return columns;
}
