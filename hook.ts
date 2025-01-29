const scripts = document.querySelectorAll("script");

type Hook = (...args: unknown[]) => unknown;

type HookEntry = [string, Hook];

const hookEntryPromises: Promise<HookEntry>[] = [];

for (const script of Array.from(scripts)) {
  if (script.type !== "module") {
    console.error(`script tag ${script.src} must have type=module`);
    continue;
  }

  for (const [key, fnName] of Object.entries(script.dataset)) {
    if (fnName === undefined) {
      continue;
    }
    if (!key.startsWith("hook")) {
      continue;
    }
    const exportFnName = key.replace("hook", "");
    const hookEntryPromise: Promise<HookEntry> = import(script.src).then((module) => [exportFnName, module[fnName]]);
    hookEntryPromises.push(hookEntryPromise);
  }
}

const hooksEntrySettled = await Promise.allSettled(hookEntryPromises);

for (const result of hooksEntrySettled) {
  if (result.status === "rejected") {
    console.error(result.reason);
  }
}

export const hooks: HookEntry[] = hooksEntrySettled
  .filter((result) => result.status === "fulfilled")
  .map((result) => result.value);
