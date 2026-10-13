declare module "*.mdx" {
  import type { ComponentType } from "react";
  const component: ComponentType<{ components?: Record<string, unknown> }>;
  export default component;
}
