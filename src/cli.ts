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
  .option("--split-threshold", "(advanced)", /^[1-9]\d+$/, "100")
  .option("--noise-reduction-threshold", "(advanced)", /^\d+$/, "0")
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
const splitThreshold = parseInt(options.splitThreshold, 10) || 100;
const noiseReductionThreshold = parseInt(options.noiseReductionThreshold, 10) * 0.02;

interface PlayingNote {
  playTime: number;
  instrument: Instrument;
  pitchModifier: number;
  velocity: number;
  noteId: number;
}

interface Note {
  playTime: number;
  lastTime: number;
  instrument: Instrument;
  pitchModifier: number;
  velocity: number;
}

abstract class Channel {
  public notes: Note[] = [];
  private playingNotes: PlayingNote[] = [];

  public constructor() { }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent) {
    const param1 = event.param1!;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
        const playTime = event.playTime * 0.02;
        const playedNote = param1 + 1;
        this.playingNotes.push({
          ...this.getNote(playedNote, playTime),
          noteId: playedNote,
          playTime,
          velocity: event.param2!
        });
        break;
      case MIDIEvents.EVENT_MIDI_NOTE_OFF:
        const stopTime = event.playTime * 0.02;
        const stoppedNote = param1 + 1;
        const stoppedIndex = this.playingNotes.findIndex(note => note.noteId === stoppedNote);
        if (stoppedIndex >= 0) {
          const note = this.playingNotes.splice(stoppedIndex, 1)[0];
          this.notes.push({
            ...note,
            lastTime: stopTime - note.playTime
          });
        } else log(process.stderr, `cannot determine which note to stop at ${stopTime}: note is ${stoppedNote}`);
        break;
      case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
        this.programChange(param1);
        break;
      default:
        break;
    }
  }

  protected abstract getNote(note: number, playTime: number): {
    instrument: Instrument,
    pitchModifier: number
  };

  protected abstract programChange(program: number): void;
}

class NormalChannel extends Channel {
  private static readonly HARP_LIKE_INSTRUMENTS: { readonly [key: string]: number; } = {
    [Instrument.BELL]: 90,
    [Instrument.HARP]: 66,
    [Instrument.GUITAR]: 54,
    [Instrument.BASS]: 18
  };
  private instrument = Instrument.HARP;

  public constructor() {
    super();
  }

  protected getNote(note: number, playTime: number) {
    const originalInstrument = this.instrument;
    const instrument = NormalChannel.transformInstrument(originalInstrument, note);
    const offset = NormalChannel.noteOffset(instrument);
    if (!offset) return {
      instrument,
      pitchModifier: 0
    };
    const pitchModifier = note - offset - 12;
    if (pitchModifier > 12 || pitchModifier < -12) log(process.stderr, `failed to correct note at ${Math.round(playTime)}: ${originalInstrument === instrument ? `using ${instrument}, got ${pitchModifier}` : `tried ${originalInstrument} -> ${instrument}, still got ${pitchModifier}`}`);
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
    return Instrument.HARP;
  }

  private static transformInstrument(instrument: Instrument, note: number) {
    const harpLikeInstruments = NormalChannel.HARP_LIKE_INSTRUMENTS;
    const originalOffset = harpLikeInstruments[instrument];
    if (originalOffset) return Object.entries(harpLikeInstruments).map(([instrument, offset]) => [instrument, Math.abs(originalOffset - offset), Math.abs(note - (offset + 12))] as [Instrument, number, number]).reduce((previous, current) => {
      const previousDistance = previous[2];
      const currentDistance = current[2];
      return currentDistance > previousDistance || (currentDistance === previousDistance && current[1] > previous[1]) ? previous : current;
    })[0];
    return instrument;
  }

  private static noteOffset(instrument: Instrument) {
    const harpLike = NormalChannel.HARP_LIKE_INSTRUMENTS[instrument];
    if (harpLike) return harpLike;
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

  protected programChange() { } // TODO what?

  private static instrumentFromNote(note: number) {
    if (Channel10.SNARE_NOTE_IDS.includes(note)) return Instrument.SNARE;
    if (Channel10.HAT_NOTE_IDS.includes(note)) return Instrument.HAT;
    if (Channel10.BELL_NOTE_IDS.includes(note)) return Instrument.BELL;
    if (note === 71 || note === 72) return Instrument.FLUTE;
    if (note === 80 || note === 81) return Instrument.CHIME;
    return Instrument.BASEDRUM;
  }
}

const events: MIDIFile.SequentiallyReadEvent[] = new MIDIFile(fs.readFileSync(fileName === "-" ? 0 : fs.openSync(fileName, "r"))).getMidiEvents();
const eventCount = events.length;
const length = Math.round(Math.max(...events.map(event => event.playTime)) * 0.02);
const taskGroup = new TaskGroup(groupName);
const track = taskGroup.newTask();
const segments: Task[] = [];
for (let i = 0, maxIndex = Math.floor(length / splitThreshold); i <= maxIndex; i++)
  segments[i] = taskGroup.newTask();
const taskCache: { [key: string]: Task } = {};
const barComplete = "█";
const barIncomplete = "░";
let progressBar = createProgressBar("parsing events", eventCount);
const channels: Channel[] = [];
let eventIndex = 0;
(function nextEvent() {
  if (eventIndex < eventCount) {
    const event = events[eventIndex];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channelId = event.channel!;
      (channels[channelId] || (channels[channelId] = channelId === 10 ? new Channel10 : new NormalChannel)).parseEvent(event);
    }
    eventIndex++;
    progressBar.tick();
    setImmediate(nextEvent);
  } else (async () => {
    const notes = channels.reduce((previous, current) => current ? previous.concat(current.notes) : previous, [] as Note[]);
    progressBar = createProgressBar("adding notes", notes.length);
    for (const note of notes)
      if (note.lastTime >= noiseReductionThreshold) {
        const playTime = note.playTime;
        const segmentIndex = Math.floor(playTime / splitThreshold);
        segments[segmentIndex].then(getTask(taskCache, note.instrument, note.velocity, note.pitchModifier), playTime - segmentIndex * splitThreshold);
        progressBar.tick();
      }
    if (progress || barWidth) {
      progressBar = createProgressBar("adding progress", length);
      const totalTime = formatTime(length * 0.05);
      for (let i = 0; i < length; i++) {
        const time = formatTime(i * 0.05);
        let text = "";
        if (barWidth) {
          const completeLength = Math.round(barWidth * (i / length));
          text += "⸨";
          for (let i = 0; i < completeLength; i++) text += barComplete;
          for (let i = barWidth; i > completeLength; i--) text += barIncomplete;
          text += "⸩";
        }
        if (progress) {
          if (text) text += " ";
          text += time;
          text += "/";
          text += totalTime;
        }
        const segmentIndex = Math.floor(i / splitThreshold);
        segments[segmentIndex].then(taskGroup.newTask().then(`title @a actionbar {"text":${JSON.stringify(text)},"color":"black"}`), i - segmentIndex * splitThreshold);
        progressBar.tick();
      }
      track.then(taskGroup.newTask().then("title @a actionbar \"\""), length);
    }
    for (let i = 0, len = segments.length; i < len; i++)
      track.then(segments[i], i * splitThreshold);
    progressBar = createProgressBar("converting notes to functions", taskGroup.taskCount());
    const pack = new Pack(PackType.DATA_PACK, packDescription);
    await taskGroup.addTo(pack, () => progressBar.tick());
    pack.addResource(new MinecraftFunction(functionLocation, [`function ${track.functionId}`]));
    progressBar = createProgressBar("writing files", pack.resourceCount());
    await pack.write(output, () => progressBar.tick());
  })();
})();

function getTask(taskCache: { [key: string]: Task }, instrument: Instrument, velocity: number, pitchModifier: number) {
  const key = instrument + " " + velocity + " " + pitchModifier;
  return taskCache[key] || (taskCache[key] = taskGroup.newTask().then(playSound(instrument, soundSource, velocity * 0.01, 2 ** (pitchModifier * 0.08333333333333333))));
}

function createProgressBar(action: string, total: number) {
  return new ProgressBar("⸨:bar⸩ :current/:total " + action, {
    clear: true,
    complete: barComplete,
    incomplete: barIncomplete,
    total,
    width: 18
  });
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds * 0.016666666666666666);
  return minutes + ":" + (seconds - minutes * 60).toFixed(2);
}

function log(stream: NodeJS.WriteStream, message: string) {
  const isTTY = stream.isTTY;
  if (isTTY) (stream as any).cursorTo(0);
  stream.write(message);
  if (isTTY) (stream as any).clearLine(1);
  stream.write("\n");
}
