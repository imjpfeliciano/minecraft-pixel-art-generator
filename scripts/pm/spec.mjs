#!/usr/bin/env node
/**
 * Spec CLI — `pnpm pm:spec <command>`
 *
 *   validate [glob...]        Structural check of every spec. Exit 1 on problems.
 *   index    [glob...]        Emit the flat work-item list as JSON.
 *   summary  [glob...]        Human-readable counts per spec.
 *   patch    <file> --key K --issue N
 *                             Set github.issue on one todo. Verifies intactness first.
 */

import { globSync } from "node:fs";
import { basename } from "node:path";
import {
  readSpec, writeSpec, indexSpec, validateSpec, specSlug,
  setTodoIssue, assertIntact,
} from "./lib/spec.mjs";

const DEFAULT_GLOB = "plans/*.md";

function targets(args) {
  const globs = args.filter((a) => !a.startsWith("-"));
  const pats = globs.length ? globs : [DEFAULT_GLOB];
  return pats.flatMap((g) => [...globSync(g)]).sort();
}

function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "validate": {
    let problems = [];
    for (const f of targets(args)) problems.push(...validateSpec(readSpec(f)));
    if (problems.length) {
      console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
      console.error(`\n${problems.length} problem(s)`);
      process.exit(1);
    }
    console.log(`✓ all specs valid (${targets(args).length} files)`);
    break;
  }

  case "index": {
    const all = targets(args).flatMap((f) => indexSpec(readSpec(f)));
    console.log(JSON.stringify(all, null, 2));
    break;
  }

  case "summary": {
    let gTotal = 0, gDone = 0, gOpen = 0;
    for (const f of targets(args)) {
      const spec = readSpec(f);
      const kind = spec.doc?.get("kind") ?? "?";
      if (kind === "reference") {
        console.log(`${basename(f).padEnd(30)} reference  (skipped by sync)`);
        continue;
      }
      const items = indexSpec(spec);
      const done = items.filter((i) => i.status === "completed").length;
      const open = items.length - done;
      const linked = items.filter((i) => i.issue != null).length;
      gTotal += items.length; gDone += done; gOpen += open;
      console.log(
        `${basename(f).padEnd(30)} ${String(items.length).padStart(3)} todos  ` +
        `${String(done).padStart(3)} done  ${String(open).padStart(3)} open  ` +
        `${String(linked).padStart(3)} linked  [${specSlug(spec)}]`
      );
    }
    console.log(`${"".padEnd(30)} ${String(gTotal).padStart(3)} todos  ${String(gDone).padStart(3)} done  ${String(gOpen).padStart(3)} open  (TOTAL)`);
    break;
  }

  case "patch": {
    const file = args[0];
    const key = flag(args, "key");
    const issue = Number(flag(args, "issue"));
    if (!file || !key || !Number.isInteger(issue)) {
      console.error("usage: pm:spec patch <file> --key <spec/milestone/todo> --issue <n>");
      process.exit(2);
    }
    const spec = readSpec(file);
    const before = indexSpec(spec);
    setTodoIssue(spec, key, issue);
    assertIntact(spec, before);
    writeSpec(spec);
    console.log(`✓ ${key} -> #${issue}`);
    break;
  }

  default:
    console.error("commands: validate | index | summary | patch");
    process.exit(2);
}
