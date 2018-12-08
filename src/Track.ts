import { Pack, PackType } from "minecraft-packs";
import ResourceLocation from "resource-location";
import { CommandEntry } from "./CommandEntry";
import ToFunctionContext from "./ToFunctionContext";

export class Track {
  public readonly commands: ReadonlyArray<CommandEntry>;

  public constructor(commands: Iterable<CommandEntry> | ArrayLike<CommandEntry>) {
    this.commands = Array.from(commands);
  }

  public addTo(pack: Pack, id: string | ResourceLocation) {
    if (pack.type !== PackType.DATA_PACK) throw new TypeError("Adding track to pack of wrong type");
    id = ResourceLocation.from(id);
    return this.getOrAddToContext(new ToFunctionContext(pack, id.namespace), id.path);
  }

  public getOrAddToContext(context: ToFunctionContext, path?: string) {
    const commands = () => Array.from(this.commands).sort((x, y) => x.time - y.time).map(x => x.command.toMinecraftCommand(x.time, context));
    if (path) return context.getOrAddCustom(this, path, commands);
    return context.getOrAdd(this, "__track_", commands);
  }
}
