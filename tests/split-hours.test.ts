import { describe, expect, it } from "vitest";
import { MAX_HOURS_PER_SUBJECT_PER_DAY, splitHours } from "@/lib/scheduler/model";

describe("splitHours", () => {
  it("varsayılan kurallarda parçaları 2 ile sınırlar", () => {
    expect(splitHours(5, { 5: [2, 2, 1] })).toEqual([2, 2, 1]);
    expect(splitHours(6, { 6: [2, 2, 2] })).toEqual([2, 2, 2]);
  });

  it("2'den büyük parçaları otomatik böler", () => {
    expect(splitHours(5, { 5: [3, 2] })).toEqual([2, 1, 2]);
    expect(splitHours(4, { 4: [4] })).toEqual([2, 2]);
    expect(
      splitHours(3, { 3: [3] }).every(
        (part) => part <= MAX_HOURS_PER_SUBJECT_PER_DAY
      )
    ).toBe(true);
  });
});
