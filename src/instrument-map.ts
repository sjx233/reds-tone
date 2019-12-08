import fs = require("fs");
import parse = require("csv-parse");

export interface InstrumentMap {
  defaultValue: Instrument;
  instruments: Map<number, Instrument>;
}

export interface Instrument {
  sound: string;
  velocity: number;
  offset: number;
}

export function readInstrumentMap(filename: string): Promise<InstrumentMap> {
  return new Promise((resolve, reject) => {
    let defaultValue: Instrument;
    const instruments = new Map<number, Instrument>();
    const parser = fs.createReadStream(filename).pipe(parse({
      columns: ["id", "sound", "velocity", "offset"],
      cast(value, { column }) {
        switch (column) {
          case "id":
            return value === "default" ? value : parseInt(value, 10);
          case "velocity":
            return parseFloat(value);
          case "offset":
            return parseInt(value, 10);
          default:
            return value;
        }
      }
    }));
    parser.on("readable", () => {
      let line: string[];
      while ((line = parser.read())) {
        const { id, ...value } = line as unknown as Instrument & { id: "default" | number; };
        if (id === "default") {
          if (defaultValue) reject(new Error("duplicate default instrument"));
          defaultValue = value;
        } else {
          if (instruments.has(id)) reject(new Error(`duplicate instrument ${id}`));
          instruments.set(id, value);
        }
      }
    }).once("end", () => {
      if (!defaultValue) reject(new Error("no default instrument"));
      resolve({ defaultValue, instruments });
    }).once("error", reject);
  });
}

export function getInstrument(map: InstrumentMap, id: number): Instrument {
  return map.instruments.get(id) || map.defaultValue;
}
