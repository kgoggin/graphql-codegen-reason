type ast = any;

declare module "reason" {
  export function parseRE(content: string): ast;
  export function printRE(ast: ast): string;
}
