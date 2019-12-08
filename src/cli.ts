#!/usr/bin/env node

import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import { SoundSource, Track, trackToTask } from ".";
import { Channel, NormalChannel, PercussionChannel } from "./channel";
import { readInstrumentMap } from "./instrument-map";
import { description, name, version } from "./version";
import commander = require("commander");
import fs = require("fs");
import path = require("path");
import MIDIEvents = require("midievents");
import MIDIFile = require("midifile");
import ProgressBar = require("progress");
import ResourceLocation = require("resource-location");

function integer(value: string): number {
  if (!/^\d+$/.test(value)) throw new TypeError(value + " is not an integer");
  return parseInt(value, 10);
}

function resourceLocation(value: string): ResourceLocation {
  return new ResourceLocation(value);
}

commander
  .name(name)
  .version(version)
  .description(description)
  .usage("[options] <file>")
  .option("-o, --output <file>", "output file", "out")
  .option("-d, --pack-description <description>", "data pack description", "")
  .option("-f, --function-id <id>", "function identifier", resourceLocation, new ResourceLocation("music", "play"))
  .option("-g, --group-name <name>", "task group name", "music")
  .option("-s, --sound-source <source>", "sound source", /^(master|music|record|weather|block|hostile|neutral|player|ambient|voice)$/, SoundSource.RECORD)
  .option("-t, --show-time", "show time")
  .option("-w, --progress-bar-width <width>", "progress bar width", integer, 0)
  .option("--instrument-map <file>", "instrument map", path.resolve(__dirname, "../map/instrument.map"))
  .option("--percussion-map <file>", "percussion map", path.resolve(__dirname, "../map/percussion.map"))
  .parse(process.argv);
const [fileName] = commander.args;
if (!fileName) commander.help();
const {
  output,
  packDescription,
  functionId,
  groupName,
  soundSource,
  showTime,
  progressBarWidth,
  instrumentMap,
  percussionMap
} = commander.opts() as {
  output: string;
  packDescription: string;
  functionId: ResourceLocation;
  groupName: string;
  soundSource: SoundSource;
  showTime?: true;
  progressBarWidth: number;
  instrumentMap: string;
  percussionMap: string;
};

let bar: ProgressBar;

function createProgressBar(action: string, total: number): ProgressBar {
  return new ProgressBar("[:bar] :current/:total " + action, {
    clear: true,
    complete: "=",
    incomplete: " ",
    total,
    width: 18
  });
}

(async () => {
  const events: MIDIFile.SequentiallyReadEvent[] = new MIDIFile(fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"))).getMidiEvents();
  bar = createProgressBar("parsing notes", events.length);
  const instrumentMapFile = await readInstrumentMap(instrumentMap);
  const percussionMapFile = await readInstrumentMap(percussionMap);
  const channels: Channel[] = Array.from({ length: 16 }, (_, index) => index === 9 ? new PercussionChannel(percussionMapFile) : new NormalChannel(instrumentMapFile));
  for (const event of events) {
    bar.tick();
    if (event.type === MIDIEvents.EVENT_MIDI) channels[event.channel].parseEvent(event);
  }
  const task = trackToTask(new Track(channels.flatMap(channel => channel.notes)), groupName, { progressBarWidth, showTime, soundSource });
  const pack = new Pack(PackType.DATA_PACK, packDescription);
  task.group.addTo(pack);
  pack.addResource(new MinecraftFunction(functionId, ["function " + task.functionId]));
  bar = createProgressBar("writing files: :id", pack.resourceCount());
  await pack.write(output, resource => bar.tick({ id: resource.id }));
})().catch(error => {
  process.stderr.write(`unexpected error: ${error.stack || error}\n`);
  process.exit(1);
});
