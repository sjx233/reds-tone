import ResourceLocation from "resource-location";

export type SoundSource = "ambient" | "block" | "hostile" | "master" | "music" | "neutral" | "player" | "record" | "voice" | "weather";

export function playSound(sound: string | ResourceLocation, source: SoundSource, volume?: number, pitch?: number, minimumVolume?: number) {
  let command = `execute as @a at @s run playsound ${sound} ${source} @s ~ ~ ~`;
  const pitchDefined = pitch !== undefined;
  const minimumVolumeDefined = minimumVolume !== undefined;
  if (volume !== undefined) command += " " + volume;
  else if (pitchDefined || minimumVolumeDefined) command += " 1";
  if (pitchDefined) command += " " + pitch;
  else if (minimumVolumeDefined) command += " 1";
  if (minimumVolumeDefined) command += " " + minimumVolume;
  return command;
}
