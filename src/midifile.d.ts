import MIDIEvents from "midievents";

declare class MIDIFile {
  header: MIDIFile.Header;
  tracks: MIDIFile.Track[];
  constructor(buffer?: ArrayBuffer | Uint8Array);
  getEvents(type: number, subtype: number): MIDIFile.SequentiallyReadEvent[] | MIDIFile.ConcurrentlyReadEvent[];
  getMidiEvents(): MIDIFile.SequentiallyReadEvent[] | MIDIFile.ConcurrentlyReadEvent[];
  getLyrics(): MIDIFile.SequentiallyReadLyricEvent[] | MIDIFile.ConcurrentlyReadLyricEvent[];
  getTrackEvents(index: number): MIDIEvents.Event[];
  setTrackEvents(index: number, events: ReadonlyArray<MIDIEvents.Event>): void;
  deleteTrack(index: number): void;
  addTrack(index: number): void;
  getContent(): ArrayBufferLike;
}

declare namespace MIDIFile {
  type SequentiallyReadEvent = MIDIEvents.Event & { playTime: number };
  type ConcurrentlyReadEvent = MIDIEvents.Event & { playTime: number, track: number };
  type SequentiallyReadLyricEvent = SequentiallyReadEvent & { text: string };
  type ConcurrentlyReadLyricEvent = ConcurrentlyReadEvent & { text: string };

  class Header {
    static readonly HEADER_LENGTH: number;
    static readonly FRAMES_PER_SECONDS: number;
    static readonly TICKS_PER_BEAT: number;
    datas: DataView;
    constructor(buffer?: ArrayBuffer);
    getFormat(): number;
    setFormat(format: number): void;
    getTracksCount(): number;
    setTracksCount(n: number): void;
    getTickResolution(tempo: number): number;
    getTimeDivision(): number;
    getTicksPerBeat(): number;
    setTicksPerBeat(ticksPerBeat: number): void;
    getSMPTEFrames(): number;
    getTicksPerFrame(): number;
    setSMTPEDivision(smpteFrames: number, ticksPerFrame: number): void;
  }

  class Track {
    static readonly HDR_LENGTH: number;
    datas: DataView;
    constructor(buffer?: ArrayBuffer, start?: number);
    getTrackLength(): number;
    setTrackLength(trackLength: number): void;
    getTrackContent(): DataView;
    setTrackContent(dataView: DataView | Uint8Array): void;
  }
}

export = MIDIFile;
