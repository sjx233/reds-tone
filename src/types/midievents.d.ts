declare namespace MIDIEvents {
  interface DataStream {
    position: number;
    buffer: DataView;
    readUint8(): number;
    readUint16(): number;
    readUint32(): number;
    readVarInt(): number;
    readBytes(length: number): number[];
    pos(): string;
    end(): boolean;
  }

  interface Parser {
    next(): Event | null;
  }

  interface Event {
    index: string;
    delta: number;
    type: number;
    subtype: number;
    badsubtype: number;
    length: number;
    data: number[];
    param1: number;
    param2: number;
    param3: number;
    param4: number;
    msb: number;
    lsb: number;
    prefix: number;
    tempo: number;
    tempoBPM: number;
    hour: number;
    minutes: number;
    seconds: number;
    frames: number;
    subframes: number;
    key: number;
    scale: number;
    channel: number;
  }

  const EVENT_META: number;
  const EVENT_SYSEX: number;
  const EVENT_DIVSYSEX: number;
  const EVENT_MIDI: number;
  const EVENT_META_SEQUENCE_NUMBER: number;
  const EVENT_META_TEXT: number;
  const EVENT_META_COPYRIGHT_NOTICE: number;
  const EVENT_META_TRACK_NAME: number;
  const EVENT_META_INSTRUMENT_NAME: number;
  const EVENT_META_LYRICS: number;
  const EVENT_META_MARKER: number;
  const EVENT_META_CUE_POINT: number;
  const EVENT_META_MIDI_CHANNEL_PREFIX: number;
  const EVENT_META_END_OF_TRACK: number;
  const EVENT_META_SET_TEMPO: number;
  const EVENT_META_SMTPE_OFFSET: number;
  const EVENT_META_TIME_SIGNATURE: number;
  const EVENT_META_KEY_SIGNATURE: number;
  const EVENT_META_SEQUENCER_SPECIFIC: number;
  const EVENT_MIDI_NOTE_OFF: number;
  const EVENT_MIDI_NOTE_ON: number;
  const EVENT_MIDI_NOTE_AFTERTOUCH: number;
  const EVENT_MIDI_CONTROLLER: number;
  const EVENT_MIDI_PROGRAM_CHANGE: number;
  const EVENT_MIDI_CHANNEL_AFTERTOUCH: number;
  const EVENT_MIDI_PITCH_BEND: number;
  const MIDI_1PARAM_EVENTS: number[];
  const MIDI_2PARAMS_EVENTS: number[];

  function createParser(stream: DataView | DataStream, startAt?: number, strictMode?: boolean): Parser;
  function writeToTrack(events: readonly Event[], destination: Uint8Array, strictMode: boolean): void;
  function getRequiredBufferLength(events: readonly Event[]): number;
}

export = MIDIEvents;
