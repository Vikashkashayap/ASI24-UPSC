import { lazy, type ComponentType } from "react";

type AnyModule = Record<string, ComponentType<unknown>> & { default?: ComponentType<unknown> };

/**
 * Lazy-load a page module by named or default export (for React Router code-splitting).
 */
export function lazyPage<M extends AnyModule>(
  factory: () => Promise<M>,
  exportName?: keyof M & string
) {
  return lazy(async () => {
    const mod = await factory();
    if (exportName) {
      const component = mod[exportName];
      if (!component) {
        throw new Error(`lazyPage: "${String(exportName)}" not found in module`);
      }
      return { default: component };
    }
    if (mod.default) {
      return { default: mod.default };
    }
    throw new Error("lazyPage: module has no default export");
  });
}
