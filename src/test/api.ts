import { MinecraftFunction, Pack, PackType } from "minecraft-packs";
import { TaskGroup } from "task-function";
import { Instrument, playSound, SoundSource } from "../index";

const pack = new Pack(PackType.DATA_PACK, "API Test.");
const simpleTaskGroup = new TaskGroup("api_test_simple");
const simpleC4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (-6 / 12)));
const simpleD4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (-4 / 12)));
const simpleE4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (-2 / 12)));
const simpleF4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (-1 / 12)));
const simpleG4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (1 / 12)));
const simpleA4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (3 / 12)));
const simpleB4 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (5 / 12)));
const simpleC5 = simpleTaskGroup.newTask().thenRun(playSound(Instrument.HARP, SoundSource.RECORD, 1, 2 ** (6 / 12)));
const simpleSubTrack = simpleTaskGroup.newTask()
  .thenRun(simpleC4)
  .thenRun(simpleD4, 8)
  .thenRun(simpleE4, 16)
  .thenRun(simpleF4, 24);
const simpleFinalTrack = simpleTaskGroup.newTask()
  .thenRun(simpleSubTrack)
  .thenRun(simpleSubTrack, 32)
  .thenRun(simpleG4, 64)
  .thenRun(simpleA4, 72)
  .thenRun(simpleB4, 80)
  .thenRun(simpleC5, 88);
simpleTaskGroup.addTo(pack);
pack.addResource(new MinecraftFunction("apitest:simple", [`function ${simpleFinalTrack.functionId}`]));
pack.write("test/api");
