import child_process from "child_process";

test("simple", "Simple");
test("source_specified", "Source specified", "-s", "hostile");
test("progress_information_shown", "Progress information shown", "-p");
test("progress_bar_shown", "Progress bar shown", "-w", "18");
test("progress_shown", "Progress shown", "-p", "-w", "18");

function test(name: string, description: string, ...args: string[]) {
  child_process.spawnSync(process.argv[0], ["lib/cli.js", "-o", `test/cli/${name}`, "-d", `"CLI Test (${description})."`, "-f", `clitest:${name}`, "-g", `cli_test_${name}`, ...args, "test/cli-src.mid"], {
    stdio: "inherit"
  });
}
