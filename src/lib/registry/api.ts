import { loadRealRegistry, loadSampleRegistry, type Registry } from "./load";

/** `samples=1` selects the clearly labelled synthetic set; anything else is the real registry. */
export function registryFor(searchParams: URLSearchParams): Registry {
  return searchParams.get("samples") === "1" ? loadSampleRegistry() : loadRealRegistry();
}
