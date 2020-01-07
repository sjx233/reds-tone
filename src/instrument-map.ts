import { once } from "events";
import * as fs from "fs";
import parseCSV = require("csv-parse");

export interface InstrumentMap {
  defaultValue: Instrument;
  instruments: Map<number, Instrument>;
}

export interface Instrument {
  sound: string;
  velocity: number;
  offset: number;
  sustain: boolean;
}

export async function readInstrumentMap(fileName: string): Promise<InstrumentMap> {
  let defaultValue: Instrument | undefined;
  const instruments = new Map<number, Instrument>();
  const parser = fs.createReadStream(fileName).pipe(parseCSV({
    cast(value, { column }) {
      switch (column) {
        case "id":
          return value === "default" ? value : parseInt(value, 10);
        case "velocity":
          return parseFloat(value);
        case "offset":
          return parseInt(value, 10);
        case "sustain":
          return Boolean(value);
        default:
          return value;
      }
    },
    columns: ["id", "sound", "velocity", "offset", "sustain"],
    trim: true
  }));
  parser.on("readable", () => {
    let line: Instrument & { id: "default" | number; };
    while ((line = parser.read())) {
      const { id, ...value } = line;
      if (id === "default") {
        if (defaultValue) throw new Error("duplicate default instrument");
        defaultValue = value;
      } else {
        if (instruments.has(id)) throw new Error(`duplicate instrument ${id}`);
        instruments.set(id, value);
      }
    }
  });
  await once(parser, "end");
  if (!defaultValue) throw new Error("no default instrument");
  return { defaultValue, instruments };
}

export function getInstrument(map: InstrumentMap, id: number): Instrument {
  return map.instruments.get(id) || map.defaultValue;
}
