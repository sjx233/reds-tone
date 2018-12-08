import { MinecraftFunction, Pack } from "minecraft-packs";
import ResourceLocation from "resource-location";

class ToFunctionContext {
  private readonly functions: Map<any, MinecraftFunction> = new Map;
  private readonly functionId: Map<string, number> = new Map;

  public constructor(public readonly pack: Pack, public readonly namespace: string) { }

  public add(key: any, prefix: string, commands: Iterable<string> | ArrayLike<string>) {
    return this.set(key, new MinecraftFunction(this.nextFreeId(prefix), commands));
  }

  public addCustom(key: any, path: string, commands: Iterable<string> | ArrayLike<string>) {
    return this.set(key, new MinecraftFunction(new ResourceLocation(this.namespace, path), commands));
  }

  private set(key: any, func: MinecraftFunction) {
    this.pack.addResource(func);
    this.functions.set(key, func);
    return func;
  }

  public getOrAdd(key: any, prefix: string, commands: () => Iterable<string> | ArrayLike<string>) {
    return this.functions.get(key) || this.add(key, prefix, commands());
  }

  public getOrAddCustom(key: any, path: string, commands: () => Iterable<string> | ArrayLike<string>) {
    return this.functions.get(key) || this.addCustom(key, path, commands());
  }

  private nextFreeId(prefix: string) {
    const functionId = this.functionId;
    const oldId = functionId.get(prefix) || 0;
    functionId.set(prefix, oldId + 1);
    return new ResourceLocation(this.namespace, prefix + oldId);
  }
}

export = ToFunctionContext;
