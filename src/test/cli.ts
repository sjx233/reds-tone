import child_process from "child_process";
import fs from "fs";
import path from "path";

const cliSrcDir = "test/cli-src";
for (const file of fs.readdirSync(cliSrcDir).filter(file => file[0] !== ".")) {
  const filePath = path.resolve(cliSrcDir, file);
  if (fs.statSync(filePath).isFile()) {
    const name = file.substring(0, file.lastIndexOf("."));
    const safeName = name.replace(/[^a-z0-9_.-]+/gi, "_");
    child_process.spawnSync(process.argv[0], ["lib/cli.js", "-o", path.join("test/cli", name), "-d", `"CLI Test (${file})."`, "-f", `clitest:${safeName}`, "-g", `cli_test_${safeName}`, filePath], {
      stdio: "inherit"
    });
  }
}
