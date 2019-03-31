#!/usr/bin/env node

import commander from "commander";
import fs from "fs";
import MIDIEvents from "midievents";
import MIDIFile from "midifile";
import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import ProgressBar from "progress";
import ResourceLocation from "resource-location";
import { Instrument, Note, notesToTask, SoundSource } from "./index";
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

abstract class Channel {
  public notes: Note[] = [];

  public constructor() { }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent, warn?: (message: string) => void) {
    const param1 = event.param1!;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
        const playTime = event.playTime * 0.02;
        this.notes.push({
          ...this.getNote(param1 + 1, playTime, warn),
          playTime,
          velocity: event.param2!
        });
        break;
      case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
        this.programChange(param1);
        break;
      default:
        break;
    }
  }

  protected abstract getNote(note: number, playTime: number, warn?: (message: string) => void): {
    instrument: Instrument,
    pitchModifier: number
  };

  protected abstract programChange(program: number): void;
}

class NormalChannel extends Channel {
  private static readonly TRANSFORMABLE_INSTRUMENTS: { readonly [key: string]: number; } = {
    [Instrument.BELL]: 90,
    [Instrument.HARP]: 66,
    [Instrument.GUITAR]: 54,
    [Instrument.BASS]: 18
  };
  private instrument = Instrument.HARP;

  public constructor() {
    super();
  }

  protected getNote(note: number, playTime: number, warn?: (message: string) => void) {
    const originalInstrument = this.instrument;
    const instrument = NormalChannel.transformInstrument(originalInstrument, note);
    const offset = NormalChannel.noteOffset(instrument);
    if (!offset) return {
      instrument,
      pitchModifier: 0
    };
    const pitchModifier = note - offset - 12;
    if (warn && (pitchModifier > 12 || pitchModifier < -12)) warn(`failed to correct note at ${Math.round(playTime)}: ${originalInstrument === instrument ? `using ${instrument}, got ${pitchModifier}` : `tried ${originalInstrument} -> ${instrument}, still got ${pitchModifier}`}`);
    return {
      instrument,
      pitchModifier
    };
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
    if (program === 105) return Instrument.BANJO;
    return Instrument.HARP;
  }

  private static transformInstrument(instrument: Instrument, note: number) {
    const transformableInstruments = NormalChannel.TRANSFORMABLE_INSTRUMENTS;
    const originalOffset = transformableInstruments[instrument];
    if (originalOffset) return Object.entries(transformableInstruments).map(([instrument, offset]) => [instrument, Math.abs(originalOffset - offset), Math.abs(note - (offset + 12))] as [Instrument, number, number]).reduce((previous, current) => {
      const previousDistance = previous[2];
      const currentDistance = current[2];
      return currentDistance > previousDistance || (currentDistance === previousDistance && current[1] > previous[1]) ? previous : current;
    })[0];
    return instrument;
  }

  private static noteOffset(instrument: Instrument) {
    const transformable = NormalChannel.TRANSFORMABLE_INSTRUMENTS[instrument];
    if (transformable) return transformable;
    switch (instrument) {
      case Instrument.FLUTE:
        return 78;
      case Instrument.CHIME:
      case Instrument.XYLOPHONE:
        return 90;
      default:
        return undefined;
    }
  }
}

class Channel10 extends Channel {
  private static readonly SNARE_NOTE_IDS: ReadonlyArray<number> = [37, 38, 40, 49, 51, 52, 54, 55, 57, 58, 59, 69, 70];
  private static readonly HAT_NOTE_IDS: ReadonlyArray<number> = [42, 44, 46, 73, 74, 75, 76, 77];
  private static readonly BELL_NOTE_IDS: ReadonlyArray<number> = [53, 56, 67, 68];

  public constructor() {
    super();
  }

  protected getNote(note: number) {
    return {
      instrument: Channel10.instrumentFromNote(note),
      pitchModifier: 0
    };
  }

  protected programChange() { }

  private static instrumentFromNote(note: number) {
    if (Channel10.SNARE_NOTE_IDS.includes(note)) return Instrument.SNARE;
    if (Channel10.HAT_NOTE_IDS.includes(note)) return Instrument.HAT;
    if (Channel10.BELL_NOTE_IDS.includes(note)) return Instrument.BELL;
    if (note === 71 || note === 72) return Instrument.FLUTE;
    if (note === 80 || note === 81) return Instrument.CHIME;
    return Instrument.BASEDRUM;
  }
}

(async () => {
  const events: MIDIFile.SequentiallyReadEvent[] = new MIDIFile(fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"))).getMidiEvents();
  const eventCount = events.length;
  let progressBar = createProgressBar("parsing events", eventCount);
  const channels: Channel[] = [];
  for (let i = 0; i < eventCount; i++) {
    const event = events[i];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channelId = event.channel!;
      (channels[channelId] || (channels[channelId] = channelId === 10 ? new Channel10 : new NormalChannel)).parseEvent(event, message => log(process.stderr, message));
    }
    progressBar.tick();
  }
  const notes = channels.flatMap(channel => channel.notes);
  progressBar = createProgressBar("adding notes", notes.length);
  const { group, functionId } = notesToTask(notes, groupName, soundSource, progress, barWidth, () => progressBar.tick(), length => progressBar = createProgressBar("adding progress", length), () => progressBar.tick());
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

function log(stream: NodeJS.WriteStream, message: string) {
  const isTTY = stream.isTTY;
  if (isTTY) (stream as any).cursorTo(0);
  stream.write(message);
  if (isTTY) (stream as any).clearLine(1);
  stream.write("\n");
}
