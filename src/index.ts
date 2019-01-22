import ResourceLocation from "resource-location";

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
  HARP = "block.note_block.harp",
  PLING = "block.note_block.pling"
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

export function playSound(sound: string | ResourceLocation, source: SoundSource, volume?: number, pitch?: number, minimumVolume?: number) {
  let command = `execute as @a at @s run playsound ${ResourceLocation.from(sound)} ${source} @s ~ ~ ~`;
  const pitchDefined = pitch !== undefined;
  const minimumVolumeDefined = minimumVolume !== undefined;
  if (volume !== undefined) command += " " + volume;
  else if (pitchDefined || minimumVolumeDefined) command += " 1";
  if (pitchDefined) command += " " + pitch;
  else if (minimumVolumeDefined) command += " 1";
  if (minimumVolumeDefined) command += " " + minimumVolume;
  return command;
}
