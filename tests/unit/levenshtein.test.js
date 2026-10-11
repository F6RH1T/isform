import { test } from "node:test";
import assert from "node:assert/strict";
import { levenshtein } from "../../src/lib/levenshtein.js";

test("levenshtein: bilinen örnekler", () => {
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("", "abc"), 3);
  assert.equal(levenshtein("abc", ""), 3);
  assert.equal(levenshtein("abc", "abc"), 0);
});

test("levenshtein: simetriktir", () => {
  assert.equal(levenshtein("enorpa", "enorpaa"), levenshtein("enorpaa", "enorpa"));
});
