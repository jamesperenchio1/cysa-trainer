/**
 * Usage: npm run add-questions -- path/to/more-questions.json
 * (defaults to data/new-questions.json if no path given)
 *
 * File format: a JSON array of question objects, same shape as data/questions.json.
 * Just write new ones (with unique external_key values, e.g. "SO-100", "VM-050")
 * in that format and run this — it upserts by external_key so re-running is safe.
 */
import path from "path";
import { execSync } from "child_process";

const arg = process.argv[2] || "data/new-questions.json";
const target = path.resolve(arg);

console.log(`Importing questions from ${target} ...`);
execSync(`tsx "${path.join(__dirname, "seed.ts")}" --file="${target}"`, { stdio: "inherit" });
