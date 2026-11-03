# Rule: Project Walkthrough

Purpose: help students learning development and AI engineering find what changed in the code quickly, and understand why it was needed and how it works.

Principle: each explanation is concise but complete enough for a beginner. The file may be as long as needed, provided it is organized so a student can navigate it quickly.

## When to write one
- When a project or milestone is reported complete, or when the student asks for a walkthrough.
- Never mid-task.

## Where to save it
1. Look in the workspace root for an existing memory bank folder (`memory-bank`, `memory_bank`, `memorybank`, `.memory-bank`). Use it if found.
2. If none exists, create `memory-bank/`.
3. Ensure a `walkthroughs/` subfolder exists inside it; create it if missing.
4. Save as `<project-or-milestone-name>-WALKTHROUGH.md`.
5. Never silently overwrite an existing walkthrough.
   - Small additions or corrections: append a dated `## Revision YYYY-MM-DD` section.
   - Full rewrites that supersede the old version: put the new version at the top and reduce the old one to a short `## Previous version` note that lists what a returning reader should re-read (or archive it as `<name>-WALKTHROUGH-v1.md` in the same folder). The file must never contain two full walkthroughs.
6. If a matching context file exists in the memory bank, add a one-line link to the walkthrough there.

## File structure
Use these sections in this order.
1. **Title and table of contents**: links to every section below so students can jump.
2. **Overview**: 2-3 sentences on what was built, plus a **Start here** line explaining in plain business terms why the project exists and what problem it solves.
3. **Running example**: a small table or list of sample data (preferably the project's own sample or demo data) reused in every example in the file.
4. **Logic flow**: numbered plain-language steps showing how data and control move through the project, each with a one-line example. Follow with typed diagrams: a one-line caption above each chain, and the data type or shape at each arrow (for example, `Sale[] -> validate -> Sale[] -> total -> number`).
5. **Key changes**: a table of file links with the specific function or section, each with one short example (input to output). One brief example per cell.
6. **Lessons**: 3-5 of the most functionality-impacting decisions, each using the lesson unit below.
7. **Verification**: 2-3 lines on what was checked and what that proves. No raw output or cleanup notes.
8. **Glossary**: every defined term, alphabetized, each with a link to relevant code.
9. **Further reading**: only if relevant.

## Lesson unit (repeat for every decision, in this order)
- **Concept**: the choice made and why it exists, in 2-3 sentences. Include tradeoffs or alternatives only if they matter.
- **Code reference**: file link plus a snippet of 15 lines or fewer, followed by a short annotation of the syntax, part by part (for example, `[...locations]` copies each item into a new list).
- **Example**: input beside output using the running example, so the student can trace the logic from syntax to result. Show the failure case too where relevant.
- **Without this**: a before/after pair showing the wrong result and the right result side by side.
- **Takeaway**: one sentence the student can remember.
- Place nothing after the Takeaway.

## Writing for beginners
- Assume the reader has never seen the concept before.
- Define each term in one sentence at first use, with a link to where it appears in the code (for example, "**Map**: a collection that looks up values by key; see `requireMenuItem` in [transformations.ts](path)"). Do not bury definitions mid-sentence.
- Define every term before using it, including small ones (for example: descending, milliseconds, synthetic, clamping, spread expression, module entry point, type checker). Prefer simpler wording over jargon.
- Explain how algorithms work (for example, binary search) in one or two plain sentences, and also by example.
- Prefer worked examples with numbers over abstract explanation. Use the running example; introduce new numbers only when a concept needs them.
- When an example involves a calculation, show the formula and each step so a student can reproduce it (for example, `(37 - 14.40) / 37 * 100 = 61.08%`).
- Put long multi-step arithmetic in a collapsible `<details><summary>One-line result</summary> ... </details>` block, with the result visible in the summary, so the main text stays easy to read.
- If a sample result looks odd (very small, very large, or zero), add one sentence saying it comes from the sample data and is not a bug.

## Guardrails
- Verify every factual or numeric claim against the code before stating it, especially rounding, floating-point, date, and time-zone behavior. Check with a one-line read-only snippet when possible. Never state a result from memory.
- Cite only what is visible in the code or project docs. Label any guessed rationale as "inferred".
- Do not ask the student questions or add quizzes. The file is informational.
- Do not modify project code while writing the walkthrough. Tiny read-only verification snippets are allowed.
- Keep each explanation concise; organization, not omission, keeps the file readable.

## Student preferences (edit freely)
<!-- Examples:
- Use more real-world analogies.
- Go deeper on AI-specific concepts (prompts, embeddings, evaluation).
- Keep the glossary in order of first appearance instead of alphabetical.
-->
