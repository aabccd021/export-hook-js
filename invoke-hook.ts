const scripts = document.querySelectorAll("script");

for (const script of Array.from(scripts)) {
  if (script.type !== "module") {
    continue;
  }
  const hookName = script.dataset["invokeHook"];
  if (hookName === undefined) {
    continue;
  }
  import(script.src).then((module) => module[hookName]());
}
