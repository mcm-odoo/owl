import { compile } from "../src";

export function getConsoleOutput(): string[] {
  return (globalThis as any).__owl_console_output.splice(0);
}

type CompileOptions = NonNullable<Parameters<typeof compile>[1]>;

/**
 * Compiles a template and snapshots the generated code.
 */
export function snapshotTemplate(template: string, options: Partial<CompileOptions> = {}) {
  const fn = compile(template, { hasGlobalValues: false, ...options });
  expect(fn.toString()).toMatchSnapshot();
}
