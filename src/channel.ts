import { Note } from ".";
import { getInstrument, Instrument, InstrumentMap } from "./instrument-map";
import MIDIEvents = require("midievents");
import MIDIFile = require("midifile");

export abstract class Channel {
  public notes: [number, Note][] = [];

  public constructor(public readonly percussion: boolean) { }

  public parseEvent(event: MIDIFile.SequentiallyReadEvent): void {
    switch (event.subtype) {
      case MIDIEvents.EVENT_MIDI_NOTE_ON:
        this.notes.push([event.playTime * 0.02, this.getNote(event.param1 + 1, event.param2)]);
        break;
      case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
        this.programChange(event.param1);
        break;
      default:
        break;
    }
  }

  protected abstract getNote(note: number, velocity: number): Note;

  protected abstract programChange(program: number): void;
}

export class NormalChannel extends Channel {
  private sound!: string;
  private velocity!: number;
  private offset!: number;

  public constructor(private readonly map: InstrumentMap) {
    super(false);
    this.setInstrument(map.defaultValue);
  }

  protected getNote(note: number, velocity: number): Note {
    return new Note(this.sound, Number.isNaN(this.offset) ? 0 : note - this.offset, velocity * this.velocity);
  }

  protected programChange(program: number): void {
    this.setInstrument(getInstrument(this.map, program));
  }

  private setInstrument({ sound, velocity, offset }: Instrument): void {
    this.sound = sound;
    this.velocity = velocity;
    this.offset = offset;
  }
}

export class PercussionChannel extends Channel {
  public constructor(private readonly map: InstrumentMap) {
    super(true);
  }

  protected getNote(note: number): Note {
    const { sound: sound, velocity: volume } = getInstrument(this.map, note);
    return new Note(sound, 0, volume);
  }

  protected programChange(): void {
    // percussion channels ignore this
  }
}
