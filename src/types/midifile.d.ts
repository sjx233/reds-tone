import { Event, LyricsEvent, MIDIEvent, TextEvent } from "midievents";

declare class MIDIFile {
  header: MIDIFile.Header;
  tracks: MIDIFile.Track[];
  constructor(buffer?: ArrayBuffer | Uint8Array);
  getEvents(type?: number, subtype?: number): MIDIFile.ResolvedEvent[];
  getMidiEvents(): MIDIFile.ResolvedMIDIEvent[];
  getLyrics(): MIDIFile.ResolvedLyricEvent[];
  getTrackEvents(index: number): Event[];
  setTrackEvents(index: number, events: readonly Event[]): void;
  deleteTrack(index: number): void;
  addTrack(index: number): void;
  getContent(): ArrayBuffer;
}

declare namespace MIDIFile {
  type Format = 0 | 1 | 2;
  type ResolvedEvent = Event & {
    playTime: number;
    track?: number;
  };
  type ResolvedMIDIEvent = MIDIEvent & {
    playTime: number;
    track?: number;
  };
  type ResolvedLyricEvent = (LyricsEvent | TextEvent) & {
    playTime: number;
    track?: number;
    text: string;
  };

  class Header {
    static readonly HEADER_LENGTH: 14;
    static readonly FRAMES_PER_SECONDS: 1;
    static readonly TICKS_PER_BEAT: 2;
    datas: DataView;
    constructor(buffer?: ArrayBuffer);
    getFormat(): Format;
    setFormat(format: Format): void;
    getTracksCount(): number;
    setTracksCount(n: number): void;
    getTickResolution(tempo: number): number;
    getTimeDivision(): typeof Header.FRAMES_PER_SECONDS | typeof Header.TICKS_PER_BEAT;
    getTicksPerBeat(): number;
    setTicksPerBeat(ticksPerBeat: number): void;
    getSMPTEFrames(): number;
    getTicksPerFrame(): number;
    setSMTPEDivision(smpteFrames: number, ticksPerFrame: number): void;
  }

  class Track {
    static readonly HDR_LENGTH: 8;
    datas: DataView;
    constructor(buffer?: ArrayBuffer, start?: number);
    getTrackLength(): number;
    setTrackLength(trackLength: number): void;
    getTrackContent(): DataView;
    setTrackContent(dataView: DataView | Uint8Array): void;
  }
}

export = MIDIFile;
