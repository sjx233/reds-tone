import { Pack, PackType } from "minecraft-packs";
import { CommandEntry, PlaySound, Track } from "../index";

const pack = new Pack(PackType.DATA_PACK, "Test music.");
new Track([
  new CommandEntry(8 * 0, new PlaySound("block.note_block.harp", "record", 1, 2 ** (-6 / 12))),
  new CommandEntry(8 * 1, new PlaySound("block.note_block.harp", "record", 1, 2 ** (-4 / 12))),
  new CommandEntry(8 * 2, new PlaySound("block.note_block.harp", "record", 1, 2 ** (-2 / 12))),
  new CommandEntry(8 * 3, new PlaySound("block.note_block.harp", "record", 1, 2 ** (-1 / 12))),
  new CommandEntry(8 * 4, new PlaySound("block.note_block.harp", "record", 1, 2 ** (1 / 12))),
  new CommandEntry(8 * 5, new PlaySound("block.note_block.harp", "record", 1, 2 ** (3 / 12))),
  new CommandEntry(8 * 6, new PlaySound("block.note_block.harp", "record", 1, 2 ** (5 / 12))),
  new CommandEntry(8 * 7, new PlaySound("block.note_block.harp", "record", 1, 2 ** (6 / 12)))
]).addTo(pack, "simple:play");
pack.write("test");
