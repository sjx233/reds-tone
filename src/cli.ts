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
  .version("1.0.3")
  .description("Music in Minecraft 1.14+ datapacks.")
  .usage("[options] <file>")
  .option("-o, --output <file>", "Place the output into <file>.", "out")
  .option("-d, --pack-description <description>", "Data pack description.", "")
  .option("-f, --function-id <id>", "Function ID.", "music:play")
  .option("-g, --group-name <name>", "Task group name.", "music")
  .option("-s, --sound-source <source>", "Play sound from <source>.", /^(master|music|record|weather|block|hostile|neutral|player|ambient|voice)$/, SoundSource.RECORD)
  .parse(process.argv);
const args = commander.args;
const options = commander.opts();
const fileName = args[0];
if (!fileName) commander.help();
const { output, packDescription, functionId, groupName, soundSource } = options;
const functionIdLocation = new ResourceLocation(functionId);

abstract class Channel {
  public constructor() { }

  public parseEvent(track: Task, taskCache: { [key: string]: Task }, event: MIDIFile.SequentiallyReadEvent | MIDIFile.ConcurrentlyReadEvent) {
    const param1 = event.param1!;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
        this.playNote(track, taskCache, event.playTime * 0.02, param1, event.param2! * 0.01);
        break;
      case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
        this.programChange(param1);
        break;
      default:
        break;
    }
  }

  protected abstract playNote(track: Task, taskCache: { [key: string]: Task }, playTime: number, note: number, velocity: number): void;

  protected abstract programChange(program: number): void;

  protected static getTask(taskCache: { [key: string]: Task }, instrument: Instrument, velocity: number, pitchModifier: number) {
    const key = `${instrument} ${velocity} ${pitchModifier}`;
    if (key in taskCache) return taskCache[key];
    return taskCache[key] = taskGroup.newTask().then(playSound(instrument, soundSource, velocity, 2 ** (pitchModifier / 12)));
  }
}

class NormalChannel extends Channel {
  private instrument = Instrument.HARP;

  public constructor() {
    super();
  }

  protected playNote(track: Task, taskCache: { [key: string]: Task }, playTime: number, note: number, velocity: number) {
    const [instrument, pitchModifier] = NormalChannel.transformNote(this.instrument, note);
    track.then(Channel.getTask(taskCache, instrument, velocity, pitchModifier), playTime);
  }

  protected programChange(program: number) {
    this.instrument = NormalChannel.instrumentFromProgram(program);
  }

  private static instrumentFromProgram(program: number) {
    if (program === 13) return Instrument.XYLOPHONE;
    if (program === 14) return Instrument.BELL;
    if (program >= 24 && program <= 31) return Instrument.GUITAR;
    if (program >= 32 && program <= 39) return Instrument.BASS;
    if (program >= 72 && program <= 79) return Instrument.FLUTE;
    return Instrument.HARP;
  }

  private static transformNote(instrument: Instrument, note: number): [Instrument, number] {
    const offset = NormalChannel.noteOffset(instrument);
    if (offset === -1) return [instrument, 12];
    const pitchModifier = note + 1 - offset;
    if (instrument === Instrument.HARP) if (pitchModifier > 24) return [Instrument.BELL, pitchModifier - 24];
    else if (pitchModifier < 0 && pitchModifier >= -18) return [Instrument.GUITAR, pitchModifier + 12];
    else if (pitchModifier < -18) return [Instrument.BASS, pitchModifier + 48];
    return [instrument, pitchModifier];
  }

  private static noteOffset(instrument: Instrument) {
    switch (instrument) {
      case Instrument.BASS:
        return 18;
      case Instrument.GUITAR:
        return 54;
      case Instrument.HARP:
        return 66;
      case Instrument.FLUTE:
        return 78;
      case Instrument.BELL:
      case Instrument.CHIME:
      case Instrument.XYLOPHONE:
        return 90;
      default:
        return -1;
    }
  }
}

class Channel10 extends Channel {
  private static readonly SNARE_NOTE_IDS: ReadonlyArray<number> = [36, 37, 39, 48, 50, 51, 53, 54, 56, 57, 58, 68, 69];
  private static readonly HAT_NOTE_IDS: ReadonlyArray<number> = [41, 43, 45, 72, 73, 74, 75, 76];
  private static readonly BELL_NOTE_IDS: ReadonlyArray<number> = [52, 55, 66, 67];

  public constructor() {
    super();
  }

  protected playNote(track: Task, taskCache: { [key: string]: Task }, playTime: number, note: number, velocity: number) {
    track.then(Channel.getTask(taskCache, Channel10.instrumentFromNote(note), velocity, 12), playTime);
  }

  protected programChange() { } // TODO what?

  private static instrumentFromNote(note: number) {
    if (Channel10.SNARE_NOTE_IDS.includes(note)) return Instrument.SNARE;
    if (Channel10.HAT_NOTE_IDS.includes(note)) return Instrument.HAT;
    if (Channel10.BELL_NOTE_IDS.includes(note)) return Instrument.BELL;
    if (note === 70 || note === 71) return Instrument.FLUTE;
    if (note === 79 || note === 80) return Instrument.CHIME;
    return Instrument.BASEDRUM;
  }
}

const events = new MIDIFile(fs.readFileSync(fileName === "-" ? 1 : fs.openSync(fileName, "r"))).getMidiEvents();
const eventCount = events.length;
const taskGroup = new TaskGroup(groupName);
const track = taskGroup.newTask();
const taskCache: { [key: string]: Task } = {};
let progressBar = createProgressBar("parsing events", eventCount);
const channels: Channel[] = [];
let eventIndex = 0;
(function nextEvent() {
  if (eventIndex < eventCount) {
    const event = events[eventIndex];
    delete events[eventIndex];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channelId = event.channel!;
      (channels[channelId] || (channels[channelId] = channelId === 10 ? new Channel10 : new NormalChannel)).parseEvent(track, taskCache, event);
    }
    eventIndex++;
    progressBar.tick();
    setImmediate(nextEvent);
  } else (async () => {
    progressBar = createProgressBar("converting notes to functions", taskGroup.taskCount());
    const pack = new Pack(PackType.DATA_PACK, packDescription);
    await taskGroup.addTo(pack, () => progressBar.tick());
    pack.addResource(new MinecraftFunction(functionIdLocation, [`function ${track.functionId}`]));
    progressBar = createProgressBar("writing files", pack.resourceCount());
    await pack.write(output, () => progressBar.tick());
  })();
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
