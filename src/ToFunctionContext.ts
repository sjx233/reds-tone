import { MinecraftFunction, Pack } from "minecraft-packs";
import ResourceLocation from "resource-location";

class ToFunctionContext {
  private readonly ids: Map<any, ResourceLocation> = new Map;
  private readonly internalIds: Map<string, number> = new Map;

  public constructor(public readonly pack: Pack, public readonly namespace: string) { }

  private set(key: any, path: string, commands: () => Iterable<string> | ArrayLike<string>) {
    const id = new ResourceLocation(this.namespace, path);
    this.ids.set(key, id);
    this.pack.addResource(new MinecraftFunction(id, commands()));
    return id;
  }

  public getOrAddCustom(key: any, path: string, commands: () => Iterable<string> | ArrayLike<string>) {
    return this.ids.get(key) || this.set(key, path, commands);
  }

  public getOrAdd(key: any, prefix: string, commands: () => Iterable<string> | ArrayLike<string>) {
    return this.ids.get(key) || this.set(key, this.nextFreeInternalId(prefix), commands);
  }

  private nextFreeInternalId(prefix: string) {
    const internalIds = this.internalIds;
    const oldId = internalIds.get(prefix) || 0;
    internalIds.set(prefix, oldId + 1);
    return prefix + oldId;
  }
}

export = ToFunctionContext;
