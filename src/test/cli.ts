import child_process from "child_process";
import fs from "fs-extra";
import path from "path";

const cliSrcDir = "test/cli-src";
for (const file of fs.readdirSync(cliSrcDir).filter(file => file[0] !== ".")) {
  const filePath = path.resolve(cliSrcDir, file);
  if (fs.statSync(filePath).isFile()) {
    const name = file.substring(0, file.lastIndexOf("."));
    const lowerCaseName = name.toLowerCase();
    child_process.spawnSync(process.argv[0], ["lib/cli.js", "-o", path.join("test/cli", name), "-d", `"CLI Test (${file})."`, "-f", `clitest${lowerCaseName.replace(/[^a-z0-9]+/g, "")}:play`, "-g", `cli_test_${lowerCaseName.replace(/[^a-z0-9_.-]+/g, "_")}`, filePath], {
      stdio: "inherit"
    });
  }
}
