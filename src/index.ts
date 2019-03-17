import "ecma-proposal-math-extensions";
import MIDIEvents from "midievents";
import MIDIFile from "midifile";
import ResourceLocation from "resource-location";
import { Task, TaskGroup } from "task-function";

export enum Instrument {
  BASS = "block.note_block.bass",
  SNARE = "block.note_block.snare",
  HAT = "block.note_block.hat",
  BASEDRUM = "block.note_block.basedrum",
  BELL = "block.note_block.bell",
  FLUTE = "block.note_block.flute",
  CHIME = "block.note_block.chime",
  GUITAR = "block.note_block.guitar",
  XYLOPHONE = "block.note_block.xylophone",
  IRON_XYLOPHONE = "block.note_block.iron_xylophone",
  COW_BELL = "block.note_block.cow_bell",
  DIDGERIDOO = "block.note_block.didgeridoo",
  BIT = "block.note_block.bit",
  BANJO = "block.note_block.banjo",
  PLING = "block.note_block.pling",
  HARP = "block.note_block.harp"
}

export enum SoundSource {
  MASTER = "master",
  MUSIC = "music",
  RECORD = "record",
  WEATHER = "weather",
  BLOCK = "block",
  HOSTILE = "hostile",
  NEUTRAL = "neutral",
  PLAYER = "player",
  AMBIENT = "ambient",
  VOICE = "voice"
}

export function playSound(sound: string | ResourceLocation, source: SoundSource, volume = 1, pitch = 1, minimumVolume = 0) {
  const soundId = ResourceLocation.from(sound);
  const baseCommand = `execute as @a at @s run playsound ${soundId} ${source} @s`;
  volume = Math.max(volume, 0);
  pitch = Math.clamp(pitch, 0, 2);
  minimumVolume = Math.clamp(minimumVolume, 0, 1);
  if (minimumVolume !== 0) return `${baseCommand} ~ ~ ~ ${volume} ${pitch} ${minimumVolume}`;
  if (pitch !== 1) return `${baseCommand} ~ ~ ~ ${volume} ${pitch}`;
  if (volume !== 1) return `${baseCommand} ~ ~ ~ ${volume}`;
  return baseCommand;
}

const barComplete = "█";
const barIncomplete = "░";

interface Note {
  playTime: number;
  instrument: Instrument;
  pitchModifier: number;
  velocity: number;
}

abstract class Channel {
  public notes: Note[] = [];

  public constructor() { }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent) {
    const param1 = event.param1!;
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
        const playTime = event.playTime * 0.02;
        this.notes.push({
          ...this.getNote(param1 + 1, playTime),
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
    if (program === 105) return Instrument.BANJO;
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

export async function eventsToTask(events: ReadonlyArray<MIDIFile.SequentiallyReadEvent>, groupName: string, soundSource = SoundSource.RECORD, progress = false, barWidth?: number, parseEventCallback?: (index: number) => void, addNotesStartCallback?: (notes: Note[]) => void, addNoteCallback?: (note: Note) => void, addProgressStartCallback?: (length: number) => void, progressTickCallback?: (tick: number) => void): Promise<Task> {
  const eventCount = events.length;
  const length = Math.round(Math.max(...events.map(event => event.playTime)) * 0.02);
  const taskGroup = new TaskGroup(groupName);
  const track = taskGroup.newTask();
  const taskCache: { [key: string]: Task } = {};
  const channels: Channel[] = [];
  for (let i = 0; i < eventCount; i++) {
    const event = events[i];
    if (event.type === MIDIEvents.EVENT_MIDI) {
      const channelId = event.channel!;
      (channels[channelId] || (channels[channelId] = channelId === 10 ? new Channel10 : new NormalChannel)).parseEvent(event);
    }
    if (parseEventCallback) parseEventCallback(i);
  }
  const notes = channels.flatMap(channel => channel.notes);
  if (addNotesStartCallback) addNotesStartCallback(notes);
  for (const note of notes) {
    track.thenRun(getTask(taskGroup, taskCache, soundSource, note.instrument, note.velocity, note.pitchModifier), note.playTime);
    if (addNoteCallback) addNoteCallback(note);
  }
  if (progress || barWidth) {
    if (addProgressStartCallback) addProgressStartCallback(length);
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
      track.thenRun(taskGroup.newTask().thenRun(`title @a actionbar {"text":${JSON.stringify(text)},"color":"black"}`), i);
      if (progressTickCallback) progressTickCallback(i);
    }
    track.thenRun(taskGroup.newTask().thenRun("title @a actionbar \"\""), length);
  }
  return track;
}

function getTask(taskGroup: TaskGroup, taskCache: { [key: string]: Task }, soundSource: SoundSource, instrument: Instrument, velocity: number, pitchModifier: number) {
  const key = instrument + " " + velocity + " " + pitchModifier;
  return taskCache[key] || (taskCache[key] = taskGroup.newTask().thenRun(playSound(instrument, soundSource, velocity * 0.01, 2 ** (pitchModifier * 0.08333333333333333))));
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
