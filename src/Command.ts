import ResourceLocation from "resource-location";
import ToFunctionContext from "ToFunctionContext";
import { Track } from "./Track";

export abstract class Command {
  public constructor() { }

  public abstract toMinecraftCommand(time: number, context: ToFunctionContext): string;
}

type SoundSource = "ambient" | "block" | "hostile" | "master" | "music" | "neutral" | "player" | "record" | "voice" | "weather";

export class PlaySound extends Command {
  public readonly sound: ResourceLocation;

  public constructor(sound: string | ResourceLocation, public readonly source: SoundSource, public readonly volume?: number, public readonly pitch?: number, public readonly minimumVolume?: number) {
    super();
    this.sound = typeof sound === "string" ? new ResourceLocation(sound) : sound;
  }

  public toMinecraftCommand(time: number, context: ToFunctionContext) {
    const functionName = context.getOrAdd(this, "__note_", () => {
      let command = `execute as @a at @s run playsound ${this.sound} ${this.source} @s ~ ~ ~`;
      const pitchDefined = this.pitch !== undefined;
      const minimumVolumeDefined = this.minimumVolume !== undefined;
      if (this.volume !== undefined) command += " " + this.volume;
      else if (pitchDefined || minimumVolumeDefined) command += " 1";
      if (pitchDefined) command += " " + this.pitch;
      else if (minimumVolumeDefined) command += " 1";
      if (minimumVolumeDefined) command += " " + this.minimumVolume;
      return [command];
    }).id;
    return time > 0 ? `schedule function ${functionName} ${time}` : `function ${functionName}`;
  }
}

export class PlayTrack extends Command {
  public constructor(public readonly track: Track) {
    super();
  }

  public toMinecraftCommand(time: number, context: ToFunctionContext) {
    const functionName = this.track.getOrAddToContext(context).id;
    return time > 0 ? `schedule function ${functionName} ${time}` : `function ${functionName}`;
  }
}
