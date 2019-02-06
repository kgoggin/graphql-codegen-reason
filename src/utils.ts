import { camelCase } from "lodash";

export type ScalarMap = {
  [key: string]: string;
};

const reservedWords = ["type", "and", "or", "class", "end"];

export const sanitizeFieldName = (fieldName: string) => {
  const camel = camelCase(fieldName);
  if (reservedWords.includes(camel)) {
    return camel + "_";
  }

  return camel;
};

export const makeEnumTypeName = (name: string) => {
  // appending enum because GraphQL allows enums to share names with common types
  return camelCase(name) + "_enum";
};
