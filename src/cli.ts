#!/usr/bin/env node

import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import { convertNotesToTask, Instrument, Note, SoundSource } from "./index";
import { description, name, version } from "./version";
import commander = require("commander");
import fs = require("fs");
import MIDIEvents = require("midievents");
import MIDIFile = require("midifile");
import ProgressBar = require("progress");
import ResourceLocation = require("resource-location");
import tty = require("tty");

commander
  .name(name)
  .version(version)
  .description(description)
  .usage("[options] <file>")
  .option("-o, --output <file>", "output file", "out")
  .option("-d, --pack-description <description>", "data pack description", "")
  .option("-f, --function-id <id>", "function identifier", "music:play")
  .option("-g, --group-name <name>", "task group name", "music")
  .option("-s, --sound-source <source>", "sound source", /^(master|music|record|weather|block|hostile|neutral|player|ambient|voice)$/, SoundSource.RECORD)
  .option("-t, --show-time", "show time")
  .option("-w, --progress-bar-width <width>", "progress bar width", /^\d+$/, "0")
  .option("-p, --progress", "show time (deprecated, use --show-time instead)")
  .option("--bar-width <width>", "progress bar width (deprecated, use --progress-bar-width instead)", /^\d+$/, "0")
  .parse(process.argv);
const args = commander.args;
const options = commander.opts();
const fileName = args[0];
if (!fileName) commander.help();
const output: string = options.output;
const packDescription: string = options.packDescription;
const functionId = new ResourceLocation(options.functionId);
const groupName: string = options.groupName;
const soundSource: SoundSource = options.soundSource;
const showTime: true | undefined = options.showTime || options.progress;
const progressBarWidth = parseInt(options.progressBarWidth || options.barWidth, 10);

export interface NoteTransformation {
  transformableInstruments: readonly string[];
  transform(channel: Channel, instrument: string, note: number): string;
}

interface ParsedNote {
  instrument: string;
  note: number;
}

interface Offsets {
  readonly [key: string]: number;
}

abstract class Channel {
  public readonly offsets: Offsets;
  public readonly transformations: readonly NoteTransformation[];
  public notes: Note[] = [];

  public constructor(offsets: Offsets = {}, transformations: Iterable<NoteTransformation> | ArrayLike<NoteTransformation> = []) {
    this.offsets = { ...offsets };
    this.transformations = Array.from(transformations);
  }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent, warn?: (message: string) => void): void {
    const param1 = event.param1;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON: {
        const playTime = event.playTime * 0.02;
        let { instrument, note } = this.getNote(param1 + 1);
        const originalInstrument = instrument;
        let pitchModifier;
        if (note >= 0) {
          const offsets = this.offsets;
          let offset = offsets[instrument];
          for (const transformation of this.transformations)
            if (transformation.transformableInstruments.includes(instrument)) {
              const newOffset = offsets[instrument = transformation.transform(this, instrument, note)];
              note += newOffset - offset;
              offset = newOffset;
            }
          pitchModifier = note - offset;
        } else pitchModifier = 0;
        if (warn && (pitchModifier > 12 || pitchModifier < -12)) warn(`failed to correct note at ${Math.round(playTime)}: ${originalInstrument === instrument ? `using ${instrument}, got ${pitchModifier}` : `tried ${originalInstrument} -> ${instrument}, still got ${pitchModifier}`}`);
        this.notes.push({
          instrument,
          pitchModifier,
          playTime,
          velocity: event.param2
        });
        break;
      }
      case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
        this.programChange(param1);
        break;
      default:
        break;
    }
  }

  protected abstract getNote(note: number): ParsedNote;

  protected abstract programChange(program: number): void;
}

class NormalChannel extends Channel {
  private static readonly TRANSFORMABLE_INSTRUMENTS: readonly string[] = [Instrument.BELL, Instrument.HARP, Instrument.GUITAR, Instrument.BASS];
  private static readonly DEFAULT_OFFSETS: { readonly [key: string]: number; } = {
    [Instrument.BASS]: 42,
    [Instrument.BELL]: 90,
    [Instrument.FLUTE]: 78,
    [Instrument.CHIME]: 90,
    [Instrument.GUITAR]: 54,
    [Instrument.XYLOPHONE]: 90,
    [Instrument.HARP]: 66
  };
  private static readonly DEFAULT_TRANSFORMATION: NoteTransformation = {
    transformableInstruments: NormalChannel.TRANSFORMABLE_INSTRUMENTS,
    transform(channel, instrument, note): string {
      const offsets = channel.offsets;
      const originalOffset = offsets[instrument];
      return NormalChannel.TRANSFORMABLE_INSTRUMENTS.map((currentInstrument): [string, number, number] => {
        const offset = offsets[currentInstrument];
        return [currentInstrument, Math.abs(originalOffset - offset), Math.abs(note - offset)];
      }).reduce((previous, current) => {
        const previousDistance = previous[2];
        const currentDistance = current[2];
        return currentDistance > previousDistance || (currentDistance === previousDistance && current[1] > previous[1]) ? previous : current;
      })[0];
    }
  };
  private instrument: string = Instrument.HARP;

  public constructor(offsets: { readonly [key: string]: number; } = NormalChannel.DEFAULT_OFFSETS, transformations: Iterable<NoteTransformation> | ArrayLike<NoteTransformation> = [NormalChannel.DEFAULT_TRANSFORMATION]) {
    super(offsets, transformations);
  }

  protected getNote(note: number): ParsedNote {
    const instrument = this.instrument;
    return {
      instrument,
      note: instrument in this.offsets ? note : -1
    };
  }

  protected programChange(program: number): void {
    this.instrument = NormalChannel.instrumentFromProgram(program);
  }

  private static instrumentFromProgram(program: number): string {
    if (program === 13) return Instrument.XYLOPHONE;
    if (program === 14) return Instrument.BELL;
    if (program >= 24 && program <= 31) return Instrument.GUITAR;
    if (program >= 32 && program <= 39) return Instrument.BASS;
    if (program >= 72 && program <= 79) return Instrument.FLUTE;
    if (program === 105) return Instrument.BANJO;
    return Instrument.HARP;
  }
}

class SpecialChannel extends Channel {
  private static readonly SNARE_NOTE_IDS: readonly number[] = [37, 38, 40, 49, 51, 52, 54, 55, 57, 58, 59, 69, 70];
  private static readonly HAT_NOTE_IDS: readonly number[] = [42, 44, 46, 73, 74, 75, 76, 77];
  private static readonly BELL_NOTE_IDS: readonly number[] = [53, 56, 67, 68];

  public constructor() {
    super();
  }

  protected getNote(note: number): ParsedNote {
    return {
      instrument: SpecialChannel.instrumentFromNote(note),
      note: -1
    };
  }

  protected programChange(): void { }

  private static instrumentFromNote(note: number): string {
    if (SpecialChannel.SNARE_NOTE_IDS.includes(note)) return Instrument.SNARE;
    if (SpecialChannel.HAT_NOTE_IDS.includes(note)) return Instrument.HAT;
    if (SpecialChannel.BELL_NOTE_IDS.includes(note)) return Instrument.BELL;
    if (note === 71 || note === 72) return Instrument.FLUTE;
    if (note === 80 || note === 81) return Instrument.CHIME;
    return Instrument.BASEDRUM;
  }
}

function createProgressBar(action: string, total: number): ProgressBar {
  return new ProgressBar("⸨:bar⸩ :current/:total " + action, {
    clear: true,
    complete: "█",
    incomplete: "░",
    total,
    width: 18
  });
}

function log(stream: NodeJS.WriteStream, message: string): void {
  if (stream.isTTY) {
    (stream as tty.WriteStream).cursorTo(0, undefined as unknown as number);
    (stream as tty.WriteStream).write(message);
    (stream as tty.WriteStream).clearLine(1);
    (stream as tty.WriteStream).write("\n");
  } else {
    stream.write(message);
    stream.write("\n");
  }
}

(async () => {
  const midiEvents: MIDIFile.SequentiallyReadEvent[] = new MIDIFile(fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"))).getMidiEvents();
  const eventCount = midiEvents.length;
  let progressBar = createProgressBar("parsing events", eventCount);
  const channels: Channel[] = [];
  for (let i = 0; i < eventCount; i++) {
    const event = midiEvents[i];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channelId = event.channel;
      (channels[channelId] || (channels[channelId] = channelId === 9 ? new SpecialChannel : new NormalChannel)).parseEvent(event, message => log(process.stderr, message));
    }
    progressBar.tick();
  }
  const notes = channels.flatMap(channel => channel.notes);
  progressBar = createProgressBar("adding notes", notes.length);
  const events = convertNotesToTask(notes, groupName, {
    progressBarWidth,
    showTime,
    soundSource
  });
  events.on("addNote", () => progressBar.tick());
  events.once("progressStart", length => progressBar = createProgressBar("adding progress information", length));
  events.on("progressTick", () => progressBar.tick());
  events.once("end", async ({ group, functionId: task }) => {
    progressBar = createProgressBar("converting notes to functions", group.taskCount());
    const pack = new Pack(PackType.DATA_PACK, packDescription);
    await group.addTo(pack, () => progressBar.tick());
    pack.addResource(new MinecraftFunction(functionId, [`function ${task}`]));
    progressBar = createProgressBar("writing files", pack.resourceCount());
    await pack.write(output, () => progressBar.tick());
  });
})();
