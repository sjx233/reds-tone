import "ecma-proposal-math-extensions";
import { EventEmitter } from "events";
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

export interface Note {
  playTime: number;
  instrument: Instrument;
  pitchModifier: number;
  velocity: number;
}

export interface ConversionOptions {
  soundSource?: SoundSource;
  showTime?: boolean;
  progressBarWidth?: number;
}

export interface SyncConversionOptions extends ConversionOptions {
  callbacks?: {
    addNote?: (note: Note) => void;
    progressStart?: (trackLength: number) => void;
    progressTick?: (tick: number) => void;
  };
}

export function convertNotesToTaskSync(notes: Note[], groupName: string, options?: SyncConversionOptions) {
  const { soundSource, showTime, progressBarWidth, callbacks: { addNote, progressStart, progressTick } } = Object.assign({
    callbacks: {},
    progressBarWidth: 0,
    showTime: false,
    soundSource: SoundSource.RECORD
  }, options);
  const trackLength = Math.round(Math.max(...notes.map(note => note.playTime)));
  const taskGroup = new TaskGroup(groupName);
  const track = taskGroup.newTask();
  const taskCache = new Map<string, Task>();
  for (const note of notes) {
    const { playTime, instrument, velocity, pitchModifier } = note;
    const key = [instrument, velocity, pitchModifier].join();
    let task = taskCache.get(key);
    if (!task) taskCache.set(key, task = taskGroup.newTask().thenRun(playSound(instrument, soundSource, velocity * 0.01, 2 ** (pitchModifier * 0.08333333333333333 /* 1 / 12 */))));
    track.thenRun(task, playTime);
    if (addNote) addNote(note);
  }
  if (showTime || progressBarWidth) {
    if (progressStart) progressStart(trackLength);
    const totalTime = formatTime(trackLength * 0.05);
    for (let i = 0; i < trackLength; i++) {
      const time = formatTime(i * 0.05);
      const text: any[][] = [];
      if (progressBarWidth) {
        const completeLength = Math.round(progressBarWidth * (i / trackLength));
        text.push(["⸨", "█".repeat(completeLength), "░".repeat(progressBarWidth - completeLength), "⸩"]);
      }
      if (showTime) text.push([time, "/", totalTime]);
      track.thenRun(taskGroup.newTask().thenRun(`title @a actionbar {"text":${JSON.stringify(text.map(part => part.join("")).join(" "))},"color":"black"}`), i);
      if (progressTick) progressTick(i);
    }
    track.thenRun(taskGroup.newTask().thenRun("title @a actionbar \"\""), trackLength);
  }
  return track;
}

export function convertNotesToTask(notes: Note[], groupName: string, options?: ConversionOptions): EventEmitter {
  const events = new EventEmitter;
  (async () => convertNotesToTaskSync(notes, groupName, {
    ...options,
    callbacks: {
      addNote: note => events.emit("addNote", note),
      progressStart: trackLength => events.emit("progressStart", trackLength),
      progressTick: tick => events.emit("progressTick", tick),
    }
  }))()
    .then(track => events.emit("end", track))
    .catch(error => events.emit("error", error));
  return events;
}

export function notesToTask(notes: Note[], groupName: string, soundSource?: SoundSource, showTime?: boolean, progressBarWidth?: number, addNoteCallback?: (note: Note) => void, progressStartCallback?: (trackLength: number) => void, progressTickCallback?: (tick: number) => void) {
  return convertNotesToTaskSync(notes, groupName, {
    callbacks: {
      addNote: addNoteCallback,
      progressStart: progressStartCallback,
      progressTick: progressTickCallback
    },
    progressBarWidth,
    showTime,
    soundSource
  });
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds * 0.016666666666666666 /* 1 / 60 */);
  return minutes + ":" + (seconds - minutes * 60).toFixed(2);
}
