// Import only the CPU training components; no converter or Node CLI dependencies.
export * from "@tensorflow/tfjs-core";
export * from "@tensorflow/tfjs-layers";
import "@tensorflow/tfjs-backend-cpu";
import { version_core } from "@tensorflow/tfjs-core";
export const version = { tfjs: version_core };
