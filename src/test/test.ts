import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import { TaskGroup } from "task-function";
import { playSound } from "../index";

const pack = new Pack(PackType.DATA_PACK, "Test music.");
const simpleTaskGroup = new TaskGroup("simple");
const simpleC4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-6 / 12)));
const simpleD4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-4 / 12)));
const simpleE4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-2 / 12)));
const simpleF4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-1 / 12)));
const simpleG4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (1 / 12)));
const simpleA4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (3 / 12)));
const simpleB4 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (5 / 12)));
const simpleC5 = simpleTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (6 / 12)));
const simpleSubTrack = simpleTaskGroup.newTask()
  .then(simpleC4)
  .then(simpleD4, 8)
  .then(simpleE4, 16)
  .then(simpleF4, 24);
const simpleFinalTrack = simpleTaskGroup.newTask()
  .then(simpleSubTrack)
  .then(simpleSubTrack, 32)
  .then(simpleG4, 64)
  .then(simpleA4, 72)
  .then(simpleB4, 80)
  .then(simpleC5, 88);
simpleTaskGroup.addTo(pack);
pack.addResource(new MinecraftFunction("musictest:simple", [`function ${simpleFinalTrack.functionId}`]));
const repeatingTaskGroup = new TaskGroup("repeating");
const repeatingNote1 = repeatingTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-6 / 12)));
const repeatingNote2 = repeatingTaskGroup.newTask().then(playSound("block.note_block.harp", "record", 1, 2 ** (-4 / 12)));
const repeatingTrack1 = repeatingTaskGroup.newTask()
  .then(repeatingNote1);
const repeatingTrack2 = repeatingTaskGroup.newTask()
  .then(repeatingNote2)
  .then(repeatingTrack1, 4);
repeatingTrack1.then(repeatingTrack2, 4);
repeatingTaskGroup.addTo(pack);
pack.addResource(new MinecraftFunction("musictest:repeating", [`function ${repeatingTrack1.functionId}`])); // DO NOT CALL THIS FUNCTION UNLESS YOU KNOW WHAT YOU ARE DOING!
pack.write("test");
