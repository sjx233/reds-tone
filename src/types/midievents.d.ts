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

  const EVENT_META: 0xff;
  const EVENT_SYSEX: 0xf0;
  const EVENT_DIVSYSEX: 0xf7;
  const EVENT_MIDI: 0x8;
  const EVENT_META_SEQUENCE_NUMBER: 0x00;
  const EVENT_META_TEXT: 0x01;
  const EVENT_META_COPYRIGHT_NOTICE: 0x02;
  const EVENT_META_TRACK_NAME: 0x03;
  const EVENT_META_INSTRUMENT_NAME: 0x04;
  const EVENT_META_LYRICS: 0x05;
  const EVENT_META_MARKER: 0x06;
  const EVENT_META_CUE_POINT: 0x07;
  const EVENT_META_MIDI_CHANNEL_PREFIX: 0x20;
  const EVENT_META_END_OF_TRACK: 0x2f;
  const EVENT_META_SET_TEMPO: 0x51;
  const EVENT_META_SMTPE_OFFSET: 0x54;
  const EVENT_META_TIME_SIGNATURE: 0x58;
  const EVENT_META_KEY_SIGNATURE: 0x59;
  const EVENT_META_SEQUENCER_SPECIFIC: 0x7f;
  const EVENT_MIDI_NOTE_OFF: 0x8;
  const EVENT_MIDI_NOTE_ON: 0x9;
  const EVENT_MIDI_NOTE_AFTERTOUCH: 0xa;
  const EVENT_MIDI_CONTROLLER: 0xb;
  const EVENT_MIDI_PROGRAM_CHANGE: 0xc;
  const EVENT_MIDI_CHANNEL_AFTERTOUCH: 0xd;
  const EVENT_MIDI_PITCH_BEND: 0xe;
  const MIDI_1PARAM_EVENTS: readonly [
    typeof EVENT_MIDI_PROGRAM_CHANGE,
    typeof EVENT_MIDI_CHANNEL_AFTERTOUCH
  ];
  const MIDI_2PARAMS_EVENTS: readonly [
    typeof EVENT_MIDI_NOTE_OFF,
    typeof EVENT_MIDI_NOTE_ON,
    typeof EVENT_MIDI_NOTE_AFTERTOUCH,
    typeof EVENT_MIDI_CONTROLLER,
    typeof EVENT_MIDI_PITCH_BEND,
  ];
}

interface GenericEvent {
  index?: string;
  type: number;
  subtype: number;
  delta: number;
}

interface GenericMetaEvent extends GenericEvent {
  type: typeof MIDIEvents.EVENT_META;
  length: number;
}

interface GenericMIDIEvent extends GenericEvent {
  type: typeof MIDIEvents.EVENT_MIDI;
  channel: number;
  param1: number;
}

declare namespace MIDIEvents {
  interface SequenceNumberEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_SEQUENCE_NUMBER;
    msb: number;
    lsb: number;
  }

  interface TextEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_TEXT;
    data: number[];
  }

  interface CopyrightNoticeEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_COPYRIGHT_NOTICE;
    data: number[];
  }

  interface TrackNameEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_TRACK_NAME;
    data: number[];
  }

  interface InstrumentNameEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_INSTRUMENT_NAME;
    data: number[];
  }

  interface LyricsEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_LYRICS;
    data: number[];
  }

  interface MarkerEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_MARKER;
    data: number[];
  }

  interface CuePointEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_CUE_POINT;
    data: number[];
  }

  interface MIDIChannelPrefixEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_MIDI_CHANNEL_PREFIX;
    prefix: number;
  }

  interface EndOfTrackEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_END_OF_TRACK;
  }

  interface SetTempoEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_SET_TEMPO;
    tempo: number;
    tempoBPM: number;
  }

  interface SMPTEOffsetEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_SMTPE_OFFSET;
    hour: number;
    minutes: number;
    seconds: number;
    frames: number;
    subframes: number;
  }

  interface TimeSignatureEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_TIME_SIGNATURE;
    data: number[];
    param1: number;
    param2: number;
    param3: number;
    param4: number;
  }

  interface KeySignatureEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_KEY_SIGNATURE;
    key: number;
    scale: number;
  }

  interface SequencerSpecificEvent extends GenericMetaEvent {
    subtype: typeof EVENT_META_SEQUENCER_SPECIFIC;
    data: number[];
  }

  type MetaEvent =
    | SequenceNumberEvent
    | TextEvent
    | CopyrightNoticeEvent
    | TrackNameEvent
    | InstrumentNameEvent
    | LyricsEvent
    | MarkerEvent
    | CuePointEvent
    | MIDIChannelPrefixEvent
    | EndOfTrackEvent
    | SetTempoEvent
    | SMPTEOffsetEvent
    | TimeSignatureEvent
    | KeySignatureEvent
    | SequencerSpecificEvent;

  interface SysExEvent extends GenericEvent {
    type: typeof EVENT_SYSEX | typeof EVENT_DIVSYSEX;
    length: number;
    data: number[];
  }

  interface NoteOffEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_NOTE_OFF;
    param2: number;
  }

  interface NoteOnEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_NOTE_ON;
    param2: number;
  }

  interface NoteAftertouchEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_NOTE_AFTERTOUCH;
    param2: number;
  }

  interface ControllerEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_CONTROLLER;
    param2: number;
  }

  interface ProgramChangeEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_PROGRAM_CHANGE;
  }

  interface ChannelAftertouchEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_CHANNEL_AFTERTOUCH;
  }

  interface PitchBendEvent extends GenericMIDIEvent {
    subtype: typeof EVENT_MIDI_PITCH_BEND;
    param2: number;
  }

  type MIDIEvent =
    | NoteOffEvent
    | NoteOnEvent
    | NoteAftertouchEvent
    | ControllerEvent
    | ProgramChangeEvent
    | ChannelAftertouchEvent
    | PitchBendEvent;

  type Event =
    | MetaEvent
    | SysExEvent
    | MIDIEvent;

  function createParser(stream: DataView | DataStream, startAt?: number, strictMode?: boolean): Parser;
  function writeToTrack(events: readonly Event[], destination: Uint8Array, strictMode?: boolean): void;
  function getRequiredBufferLength(events: readonly Event[]): number;
}

export = MIDIEvents;
