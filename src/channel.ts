import { Note } from ".";
import { getInstrument, Instrument, InstrumentMap } from "./instrument-map";

export abstract class Channel {
  public readonly notes: [number, Note][] = [];
  private readonly on = new Map<number, [number, number]>();

  public noteOn(time: number, note: number, velocity: number): void {
    if (this.on.has(note)) this.noteOff(time, note);
    this.on.set(note, [time, velocity]);
  }

  public noteOff(time: number, note: number): void {
    const on = this.on.get(note);
    if (!on) return;
    this.on.delete(note);
    const [startTime, velocity] = on;
    this.addNote(startTime, time, note, velocity);
  }

  public abstract programChange(program: number): void;

  public end(time: number): void {
    for (const [note, [startTime, velocity]] of this.on.entries())
      this.addNote(startTime, time, note, velocity);
    this.on.clear();
  }

  private addNote(startTime: number, endTime: number, note: number, velocity: number): void {
    const [noteObj, sustain] = this.getNote(note, velocity);
    this.notes.push([startTime, noteObj]);
    if (sustain) while (++startTime <= endTime)
      this.notes.push([startTime, noteObj]);
  }

  protected abstract getNote(note: number, velocity: number): [Note, boolean];
}

export class NormalChannel extends Channel {
  private instrument: Instrument;

  public constructor(private readonly map: InstrumentMap) {
    super();
    this.instrument = map.defaultValue;
  }

  public programChange(program: number): void {
    this.instrument = getInstrument(this.map, program);
  }

  protected getNote(note: number, velocity: number): [Note, boolean] {
    const { sound, velocity: baseVelocity, offset, sustain } = this.instrument;
    return [new Note(sound, Number.isNaN(offset) ? 0 : note - offset, velocity * baseVelocity), sustain];
  }
}

export class PercussionChannel extends Channel {
  public constructor(private readonly map: InstrumentMap) {
    super();
  }

  public programChange(): void {
    // percussion channels ignore this
  }

  protected getNote(note: number, velocity: number): [Note, boolean] {
    const { sound, velocity: baseVelocity, sustain } = getInstrument(this.map, note);
    return [new Note(sound, 0, velocity * baseVelocity), sustain];
  }
}
