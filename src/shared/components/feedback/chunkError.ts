/**
 * True for the error a lazy route throws when its chunk is gone — typically a
 * tab opened before a deploy asking for a hashed file the new build replaced
 * (nginx answers 404). Retrying the same import cannot help: React.lazy caches
 * the rejection, so only a reload, which fetches the new index, recovers.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i.test(
    message,
  );
}

const RELOAD_KEY = "aztu.chunkReloadAt";

/**
 * Reload once to pick up a new deploy, but never loop: if the page was already
 * reloaded for this in the last minute, the chunk is genuinely missing and the
 * error screen is the honest outcome.
 */
export function reloadForNewDeploy(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: reloading without a guard could loop, so don't.
    return false;
  }
  window.location.reload();
  return true;
}
