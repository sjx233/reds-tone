import * as childProcess from "child_process";
import * as fs from "fs-extra";
import * as path from "path";

const datapacksDir = "test/datapacks";
fs.emptyDirSync(datapacksDir);

function test(name: string, ...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${name}, args = ${JSON.stringify(args)}\n`);
    childProcess.spawn(process.argv[0], [
      "lib/cli.js",
      "-o", path.join(datapacksDir, name),
      "-d", `"reds-tone test (${name})."`,
      "-f", `reds_tone_test:${name}`,
      "-g", `test_${name}`,
      ...args,
      "test/src.mid"
    ], { stdio: "inherit" }).once("exit", code => {
      if (code) reject(`cli exited with code ${code} when processing ${name}\n`);
      resolve();
    });
  });
}

(async () => {
  try {
    await test("simple");
    await test("source_specified", "-s", "hostile");
    await test("with_time", "-t");
    await test("with_progress_bar", "-w", "18");
    await test("with_time_and_progress_bar", "-t", "-w", "18");
  } catch (e) {
    process.stderr.write(e);
    process.exit(1);
  }
})();
