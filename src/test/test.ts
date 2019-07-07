import * as fs from "fs-extra";
import childProcess = require("child_process");
import path = require("path");

const datapacksDir = "test/datapacks";
const logsDir = "test/logs";
fs.emptyDirSync(datapacksDir);
fs.emptyDirSync(logsDir);

function test(name: string, description: string, ...args: string[]): void {
  const logFile = path.join(logsDir, `${name}.log`);
  fs.open(logFile, "w", (error, fd) => {
    const stdio: childProcess.StdioOptions = ["ignore", "ignore", fd];
    if (error) {
      process.stderr.write(`error opening log file ${logFile}, output will be ignored: ${error}\n`);
      stdio[2] = "ignore";
    }
    childProcess.spawn(process.argv[0], [
      "lib/cli.js",
      "-o", path.join(datapacksDir, name),
      "-d", `"reds-tone test (${description})."`,
      "-f", `reds_tone_test:${name}`,
      "-g", `test_${name}`,
      ...args,
      "test/src.mid"
    ], { stdio })
      .once("exit", () => fs.close(fd, error => {
        if (error) process.stderr.write(`error closing log file ${logFile}: ${error}`);
      }));
  });
}

test("simple", "simple");
test("source_specified", "source specified", "-s", "hostile");
test("with_time", "with time", "-t");
test("with_progress_bar", "with progress bar", "-w", "18");
test("with_time_and_progress_bar", "with time and progress bar", "-t", "-w", "18");
