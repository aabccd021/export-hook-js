type Hook = (...args: unknown[]) => unknown;

type LoadHooks = <T extends string[]>(hookNames: T) => Promise<{ [K in keyof T]: Hook[] }>;

async function loadHook(hookName: string): Promise<Hook[]> {
  const hookLoadPromises: Promise<Hook>[] = [];

  for (const script of Array.from(document.querySelectorAll("script"))) {
    if (script.type !== "module") {
      continue;
    }
    for (const [dataKey, fnName] of Object.entries(script.dataset)) {
      if (fnName !== undefined && dataKey.startsWith("exportHook") && dataKey.replace("exportHook", "") === hookName) {
        hookLoadPromises.push(import(script.src).then((module): Hook => module[fnName]));
      }
    }
  }

  const hookLoads = await Promise.allSettled(hookLoadPromises);

  for (const result of hookLoads) {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
  }

  return hookLoads.filter((hookLoad) => hookLoad.status === "fulfilled").map((result) => result.value);
}

export const loadHooks: LoadHooks = async <T extends string[]>(hookNames: T) => {
  const hookLoads = await Promise.allSettled(hookNames.map(loadHook));

  for (const result of hookLoads) {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
  }

  const hooks: Hook[][] = hookLoads.map((result) => (result.status === "fulfilled" ? result.value : []));
  return hooks as { [K in keyof T]: Hook[] };
};
