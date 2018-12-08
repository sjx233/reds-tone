import { Pack, ResourceType } from "minecraft-packs";
import ResourceLocation from "resource-location";

export function scheduleCommands(pack: Pack, type: ResourceType<any>, namespace: string, prefix: string) {
  const prefixLength = prefix.length;
  const ids = pack.getResources(type).filter(x => x.id.namespace === namespace).map(x => x.id.path).filter(x => x.startsWith(prefix)).map(x => Number(x.substring(prefixLength))).filter(x => x >= 0 && Number.isInteger(x));
  for (let i = 0; ; i++)
    if (!ids.includes(i)) return new ResourceLocation(namespace, prefix + i);
}
