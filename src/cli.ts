#!/usr/bin/env node

import commander from "commander";
import fs from "fs";
import MIDIFile from "midifile";
import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import ProgressBar from "progress";
import ResourceLocation from "resource-location";
import { eventsToTask, SoundSource } from "./index";
import { description, name, version } from "./version";

commander
  .name(name)
  .version(version)
  .description(description)
  .usage("[options] <file>")
  .option("-o, --output <file>", "place the output into <file>.", "out")
  .option("-d, --pack-description <description>", "specify data pack description", "")
  .option("-f, --function-id <id>", "function ID", "music:play")
  .option("-g, --group-name <name>", "task group name", "music")
  .option("-s, --sound-source <source>", "play sound from <source>", /^(master|music|record|weather|block|hostile|neutral|player|ambient|voice)$/, SoundSource.RECORD)
  .option("-p, --progress", "show progress information")
  .option("-w, --bar-width <width>", "show progress bar", /^\d+$/, "0")
  .parse(process.argv);
const args = commander.args;
const options = commander.opts();
const fileName = args[0];
if (!fileName) commander.help();
const { output, packDescription, functionId, groupName, soundSource, progress } = options as {
  output: string,
  packDescription: string,
  functionId: string,
  groupName: string,
  soundSource: SoundSource,
  progress?: true
};
const functionLocation = new ResourceLocation(functionId);
const barWidth = parseInt(options.barWidth, 10);

(async () => {
  const events: MIDIFile.SequentiallyReadEvent[] = new MIDIFile(fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"))).getMidiEvents();
  let progressBar = createProgressBar("parsing events", events.length);
  const { group, functionId } = await eventsToTask(events, groupName, soundSource, progress, barWidth, () => progressBar.tick(), notes => progressBar = createProgressBar("adding notes", notes.length), () => progressBar.tick(), length => progressBar = createProgressBar("adding progress", length), () => progressBar.tick());
  progressBar = createProgressBar("converting notes to functions", group.taskCount());
  const pack = new Pack(PackType.DATA_PACK, packDescription);
  await group.addTo(pack, () => progressBar.tick());
  pack.addResource(new MinecraftFunction(functionLocation, [`function ${functionId}`]));
  progressBar = createProgressBar("writing files", pack.resourceCount());
  await pack.write(output, () => progressBar.tick());
})();

function createProgressBar(action: string, total: number) {
  return new ProgressBar("⸨:bar⸩ :current/:total " + action, {
    clear: true,
    complete: "█",
    incomplete: "░",
    total,
    width: 18
  });
}
