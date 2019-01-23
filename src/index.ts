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

export function playSound(sound: string | ResourceLocation, source: SoundSource, volume = 1, pitch = 1, minimumVolume = 0) {
  const soundId = ResourceLocation.from(sound);
  const baseCommand = `execute as @a at @s run playsound ${soundId} ${source} @s`;
  volume = Math.max(volume, 0);
  pitch = clamp(pitch, 0, 2);
  minimumVolume = clamp(minimumVolume, 0, 1);
  if (minimumVolume !== 0) return `${baseCommand} ~ ~ ~ ${volume} ${pitch} ${minimumVolume}`;
  if (pitch !== 1) return `${baseCommand} ~ ~ ~ ${volume} ${pitch}`;
  if (volume !== 1) return `${baseCommand} ~ ~ ~ ${volume}`;
  return baseCommand;
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}
