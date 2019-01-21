import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import { TaskGroup } from "task-function";
import { playSound } from "../index";

const pack = new Pack(PackType.DATA_PACK, "Test music.");
const taskGroup = new TaskGroup("simple");
const c4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-6 / 12)));
const d4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-4 / 12)));
const e4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-2 / 12)));
const f4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-1 / 12)));
const g4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (1 / 12)));
const a4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (3 / 12)));
const b4 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (5 / 12)));
const c5 = taskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (6 / 12)));
const subTrack = taskGroup.newTask()
  .then(c4)
  .then(d4, 8)
  .then(e4, 16)
  .then(f4, 24);
const finalTrack = taskGroup.newTask()
  .then(subTrack)
  .then(subTrack, 32)
  .then(g4, 64)
  .then(a4, 72)
  .then(b4, 80)
  .then(c5, 88);
taskGroup.addTo(pack);
pack.addResource(new MinecraftFunction("simple:play", [`function ${finalTrack.functionId}`]));
pack.write("test");
