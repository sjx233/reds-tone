import "ecma-proposal-math-extensions";
import { Task, TaskGroup } from "task-function";
import ResourceLocation = require("resource-location");

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

export function playSound(sound: string | ResourceLocation, source: SoundSource, volume = 1, pitch = 1, minimumVolume = 0): string {
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

export class EventTaskCache {
  private readonly map = new Map<string, Task>();

  public get(event: Event, group: TaskGroup, source: SoundSource): Task {
    const key = event.key;
    let task = this.map.get(key);
    if (!task) this.map.set(key, task = event.toTask(group, source, this));
    return task;
  }
}

export abstract class Event {
  public abstract readonly length: number;
  public readonly key: string;

  public constructor(key: string) {
    this.key = key;
  }

  public abstract toTask(group: TaskGroup, source: SoundSource, cache: EventTaskCache): Task;
}

export type TimedEvent = [number, Event];

export class Note extends Event {
  public readonly instrument: string;
  public readonly pitchModifier: number;
  public readonly velocity: number;
  public readonly length = 0;

  public constructor(instrument: string, pitchModifier: number, velocity: number) {
    super(JSON.stringify([instrument, pitchModifier, velocity]));
    this.instrument = instrument;
    this.pitchModifier = pitchModifier;
    this.velocity = velocity;
  }

  public toTask(group: TaskGroup, source: SoundSource): Task {
    return group.newTask().thenRun(playSound(this.instrument, source, this.velocity * 0.01, 2 ** (this.pitchModifier / 12)));
  }
}

export class Track extends Event {
  private static key = 0;
  public readonly events: readonly TimedEvent[];

  public get length(): number {
    const length = Math.max(...this.events.map(([time, event]) => Math.round(time + event.length)));
    Object.defineProperty(this, "length", {
      value: length
    });
    return length;
  }

  public constructor(events: Iterable<TimedEvent> | ArrayLike<TimedEvent>) {
    super((Track.key++).toString());
    this.events = Array.from(events);
  }

  public toTask(group: TaskGroup, source: SoundSource, cache: EventTaskCache): Task {
    const task = group.newTask();
    for (const [time, event] of this.events)
      task.thenRun(cache.get(event, group, source), time);
    return task;
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.trunc(seconds / 60);
  return minutes + ":" + (seconds - minutes * 60).toFixed(2);
}

export interface ConversionOptions {
  soundSource?: SoundSource;
  showTime?: boolean;
  progressBarWidth?: number;
}

export function trackToTask(track: Track, groupName: string, options?: ConversionOptions): Task {
  const { soundSource, showTime, progressBarWidth } = Object.assign({
    progressBarWidth: 0,
    showTime: false,
    soundSource: SoundSource.RECORD
  }, options);
  const taskGroup = new TaskGroup(groupName);
  const task = track.toTask(taskGroup, soundSource, new EventTaskCache);
  if (showTime || progressBarWidth) {
    const trackLength = track.length;
    const totalTime = formatTime(trackLength * 0.05);
    for (let i = 0; i < trackLength; i++) {
      const time = formatTime(i * 0.05);
      const text: string[] = [];
      if (progressBarWidth) {
        const completeLength = Math.round(progressBarWidth * (i / trackLength));
        text.push(`⸨${"█".repeat(completeLength)}${"░".repeat(progressBarWidth - completeLength)}⸩`);
      }
      if (showTime) text.push(`${time}/${totalTime}`);
      task.thenRun(taskGroup.newTask().thenRun("title @a actionbar " + JSON.stringify({
        text: text.join(" "),
        color: "black"
      })), i);
    }
    task.thenRun(taskGroup.newTask().thenRun("title @a actionbar \"\""), trackLength);
  }
  return task;
}
