import "ecma-proposal-math-extensions";
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

export function notesToTask(notes: Note[], groupName: string, soundSource = SoundSource.RECORD, progress = false, barWidth?: number, addNoteCallback?: (note: Note) => void, addProgressStartCallback?: (length: number) => void, progressTickCallback?: (tick: number) => void) {
  const trackLength = Math.round(Math.max(...notes.map(note => note.playTime)));
  const taskGroup = new TaskGroup(groupName);
  const track = taskGroup.newTask();
  const taskCache: { [key: string]: Task } = {};
  for (const note of notes) {
    track.thenRun(getTask(taskGroup, taskCache, soundSource, note.instrument, note.velocity, note.pitchModifier), note.playTime);
    if (addNoteCallback) addNoteCallback(note);
  }
  if (progress || barWidth) {
    if (addProgressStartCallback) addProgressStartCallback(trackLength);
    const totalTime = formatTime(trackLength * 0.05);
    for (let i = 0; i < trackLength; i++) {
      const time = formatTime(i * 0.05);
      let text = "";
      if (barWidth) {
        const completeLength = Math.round(barWidth * (i / trackLength));
        text += "⸨";
        for (let i = 0; i < completeLength; i++) text += "█";
        for (let i = barWidth; i > completeLength; i--) text += "░";
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
    track.thenRun(taskGroup.newTask().thenRun("title @a actionbar \"\""), trackLength);
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
