import { Command } from "./Command";

export class CommandEntry {
  public constructor(public readonly time: number, public readonly command: Command) { }
}
