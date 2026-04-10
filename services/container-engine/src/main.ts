import { ContainerEngine } from "./container-engine.js";

const engine = new ContainerEngine();

try {
  await engine.ping();
  console.log("[container-engine] Le moteur Docker répond.");
} catch (e) {
  console.error("[container-engine] Le moteur Docker ne répond pas :", e);
  process.exitCode = 1;
}
