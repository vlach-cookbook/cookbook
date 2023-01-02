import { dset } from "dset";

export function parseIntOrUndefined(value: unknown) {
  // parseInt() takes all types.
  const result = parseInt(value as string);
  return Number.isNaN(result) ? undefined : result;
}

export type StructuredFormData =
  | {
    [key: string]:
    | string
    | StructuredFormData
    | Array<string | StructuredFormData>;
  }
  | StructuredFormData[];

export function structureFormData(
  data: FormData
): Exclude<StructuredFormData, StructuredFormData[]> {
  const result: StructuredFormData = {};
  for (const [key, value] of data) {
    // Ignore files.
    if (typeof value === "string") dset(result, key, value);
  }
  return result;
}
