import * as fs from "fs-extra";
import childProcess = require("child_process");
import path = require("path");

const datapacksDir = "test/datapacks";
fs.emptyDirSync(datapacksDir);

function test(name: string, description: string, ...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    childProcess.spawn(process.argv[0], [
      "lib/cli.js",
      "-o", path.join(datapacksDir, name),
      "-d", `"reds-tone test (${description})."`,
      "-f", `reds_tone_test:${name}`,
      "-g", `test_${name}`,
      ...args,
      "test/src.mid"
    ], { stdio: "ignore" })
      .once("exit", code => {
        if (code) reject(`cli exited with code ${code} when processing ${name}\n`);
        resolve();
      });
  });
}

(async () => {
  try {
    await test("simple", "simple");
    await test("source_specified", "source specified", "-s", "hostile");
    await test("with_time", "with time", "-t");
    await test("with_progress_bar", "with progress bar", "-w", "18");
    await test("with_time_and_progress_bar", "with time and progress bar", "-t", "-w", "18");
  } catch (e) {
    process.stderr.write(e);
    process.exit(1);
  }
})();
