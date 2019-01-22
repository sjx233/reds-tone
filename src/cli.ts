#!/usr/bin/env node

import commander from "commander";
import fs from "fs";
import MIDIEvents from "midievents";
import MIDIFile from "midifile";
import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import ProgressBar from "progress";
import ResourceLocation from "resource-location";
import { Task, TaskGroup } from "task-function";
import { Instrument, playSound, SoundSource } from "./index";

commander
  .name("reds-tone")
  .version("1.0.0")
  .description("Music in Minecraft 1.14+ datapacks.")
  .usage("[options] <file>")
  .option("-o, --output <file>", "Place the output into <file>.", "out")
  .option("-d, --pack-description <description>", "Data pack description.", "")
  .option("-f, --function-id <id>", "Function ID.", "music:play")
  .option("-g, --group-name <name>", "Task group name.", "music")
  .option("-s, --sound-source <source>", "Play sound from <source>.", /^(ambient|block|hostile|master|music|neutral|player|record|voice|weather)$/, SoundSource.RECORD)
  .parse(process.argv);
const args = commander.args;
const options = commander.opts();
const fileName = args[0];
if (!fileName) commander.help();
if (!fs.existsSync(fileName)) throw new Error(`'${fileName}' does not exist`);
const output = options.output;
const packDescription = options.packDescription;
const functionId = new ResourceLocation(options.functionId);
const groupName = options.groupName;
const soundSource = options.soundSource;
const events = new MIDIFile(fs.readFileSync(fileName)).getMidiEvents().sort((a, b) => a.playTime - b.playTime);
const eventCount = events.length;
const taskGroup = new TaskGroup(groupName);
const track = taskGroup.newTask();
const taskCache: { [key: string]: Task } = {};
let progressBar = createProgressBar("parsing events", eventCount);
const instruments = [Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP, Instrument.HARP];
let eventIndex = 0;
(function nextEvent() {
  if (eventIndex < eventCount) {
    const event = events[eventIndex++];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channel = event.channel!;
      const param1 = event.param1!;
      switch (event.subtype) {
        case MIDIEvents.EVENT_MIDI_NOTE_ON:
          track.then(getTask(channel === 10 ? instrumentFromNote(param1) : instruments[channel], event.param2!, channel === 10 ? 12 : pitchModifierFromNoteAndInstrument(instruments[channel], param1)), event.playTime / 50);
          break;
        case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
          instruments[channel] = instrumentFromMidiProgram(param1);
          break;
        default:
          break;
      }
    }
    progressBar.tick();
    setImmediate(nextEvent);
  } else {
    const pack = new Pack(PackType.DATA_PACK, packDescription);
    taskGroup.addTo(pack);
    pack.addResource(new MinecraftFunction(functionId, [`function ${track.functionId}`]));
    progressBar = createProgressBar("writing files", pack.resourceCount());
    pack.write(output, () => progressBar.tick());
  }
})();

function createProgressBar(action: string, total: number) {
  return new ProgressBar("⸨:bar⸩ :current/:total " + action, {
    clear: true,
    complete: "░",
    incomplete: "⠂",
    total,
    width: 18
  });
}

function getTask(instrument: Instrument, velocity: number, pitchModifier: number) {
  const key = `${instrument} ${velocity} ${pitchModifier}`;
  if (key in taskCache) return taskCache[key];
  return taskCache[key] = taskGroup.newTask().then(playSound(instrument, soundSource, velocity / 100, 2 ** (pitchModifier / 12)));
}

function instrumentFromMidiProgram(program: number) {
  switch (program) {
    case 13:
      return Instrument.XYLOPHONE;
    case 14:
      return Instrument.BELL;
    case 24:
    case 25:
    case 26:
    case 27:
    case 28:
    case 29:
    case 30:
    case 31:
      return Instrument.GUITAR;
    case 32:
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
      return Instrument.BASS;
    case 72:
    case 73:
    case 74:
    case 75:
    case 76:
    case 77:
    case 78:
    case 79:
      return Instrument.FLUTE;
    default:
      return Instrument.HARP;
  }
}

function instrumentFromNote(note: number) {
  switch (note) {
    case 36:
    case 37:
    case 39:
    case 48:
    case 50:
    case 51:
    case 53:
    case 54:
    case 56:
    case 57:
    case 58:
    case 68:
    case 69:
      return Instrument.SNARE;
    case 41:
    case 43:
    case 45:
    case 72:
    case 73:
    case 74:
    case 75:
    case 76:
      return Instrument.HAT;
    case 52:
    case 55:
    case 66:
    case 67:
      return Instrument.BELL;
    case 70:
    case 71:
      return Instrument.FLUTE;
    case 79:
    case 80:
      return Instrument.CHIME;
    default:
      return Instrument.BASEDRUM;
  }
}

function pitchModifierFromNoteAndInstrument(instrument: Instrument, note: number) {
  const offset = noteOffset(instrument);
  if (offset === -1) return 1;
  return note + 1 - offset;
}

function noteOffset(instrument: Instrument) {
  switch (instrument) {
    case Instrument.BASS:
      return 18;
    case Instrument.BELL:
      return 90;
    case Instrument.FLUTE:
      return 78;
    case Instrument.CHIME:
      return 90;
    case Instrument.GUITAR:
      return 54;
    case Instrument.XYLOPHONE:
      return 90;
    case Instrument.HARP:
      return 66;
    default:
      return -1;
  }
}
