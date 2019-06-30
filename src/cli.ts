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

export interface NoteTransformation {
  transformableInstruments: readonly Instrument[];
  transform(channel: Channel, instrument: Instrument, note: number): Instrument;
}

abstract class Channel {
  public readonly offsets: { readonly [key: string]: number; };
  public readonly transformations: readonly NoteTransformation[];
  public notes: Note[] = [];

  public constructor(offsets: { readonly [key: string]: number; } = {}, transformations: Iterable<NoteTransformation> | ArrayLike<NoteTransformation> = []) {
    this.offsets = { ...offsets };
    this.transformations = Array.from(transformations);
  }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent, warn?: (message: string) => void) {
    const param1 = event.param1!;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
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

  protected abstract getNote(note: number): {
    instrument: Instrument,
    note: number
  };

  protected abstract programChange(program: number): void;
}

class NormalChannel extends Channel {
  private static readonly TRANSFORMABLE_INSTRUMENTS: readonly Instrument[] = [Instrument.BELL, Instrument.HARP, Instrument.GUITAR, Instrument.BASS];
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
    transform(channel, instrument, note) {
      const offsets = channel.offsets;
      const originalOffset = offsets[instrument];
      return NormalChannel.TRANSFORMABLE_INSTRUMENTS.map(currentInstrument => {
        const offset = offsets[currentInstrument];
        return [currentInstrument, Math.abs(originalOffset - offset), Math.abs(note - offset)] as const;
      }).reduce((previous, current) => {
        const previousDistance = previous[2];
        const currentDistance = current[2];
        return currentDistance > previousDistance || (currentDistance === previousDistance && current[1] > previous[1]) ? previous : current;
      })[0];
    }
  };
  private instrument = Instrument.HARP;

  public constructor(offsets: { readonly [key: string]: number; } = NormalChannel.DEFAULT_OFFSETS, transformations: Iterable<NoteTransformation> | ArrayLike<NoteTransformation> = [NormalChannel.DEFAULT_TRANSFORMATION]) {
    super(offsets, transformations);
  }

  protected getNote(note: number) {
    const instrument = this.instrument;
    return {
      instrument,
      note: instrument in this.offsets ? note : -1
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
}

class SpecialChannel extends Channel {
  private static readonly SNARE_NOTE_IDS: readonly number[] = [37, 38, 40, 49, 51, 52, 54, 55, 57, 58, 59, 69, 70];
  private static readonly HAT_NOTE_IDS: readonly number[] = [42, 44, 46, 73, 74, 75, 76, 77];
  private static readonly BELL_NOTE_IDS: readonly number[] = [53, 56, 67, 68];

  public constructor() {
    super();
  }

  protected getNote(note: number) {
    return {
      instrument: SpecialChannel.instrumentFromNote(note),
      note: -1
    };
  }

  protected programChange() { }

  private static instrumentFromNote(note: number) {
    if (SpecialChannel.SNARE_NOTE_IDS.includes(note)) return Instrument.SNARE;
    if (SpecialChannel.HAT_NOTE_IDS.includes(note)) return Instrument.HAT;
    if (SpecialChannel.BELL_NOTE_IDS.includes(note)) return Instrument.BELL;
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
      (channels[channelId] || (channels[channelId] = channelId === 9 ? new SpecialChannel : new NormalChannel)).parseEvent(event, message => log(process.stderr, message));
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
