import { describe, expect, it } from "vitest";
import { splitCsvRecords } from "../lib/unified/datasets-service";

describe("CSV record parsing", () => {
  it("preserves newlines inside quoted cells and doubled quote escapes", () => {
    const content = 'name,description\r\n"Record 1","Line 1\nLine 2"\r\n"Record 2","say ""hello"""\n';
    expect(splitCsvRecords(content)).toEqual([
      "name,description",
      '"Record 1","Line 1\nLine 2"',
      '"Record 2","say ""hello"""',
    ]);
  });
  it("does not produce a phantom record for an empty trailing line", () => {
    expect(splitCsvRecords("a,b\nx,y\n\n")).toEqual(["a,b", "x,y"]);
  });
  it("rejects malformed unterminated quoted values", () => {
    expect(() => splitCsvRecords('a,b\n"unfinished')).toThrow("CSV ended inside a quoted field");
  });
});
