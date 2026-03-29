# Task List

Completed tasks should be moved to ## Recent Completed Context.
Completed tasks that are no longer needed for day-to-day context have been moved to `TASKS_archived.md`.
Pending tasks are listed under ## Pending tasks with status [pending].
Tasks under ## Refinements are optional with status [refine] and should only be done by user demand.
Ideas for expansion and new capabilities go under ## Future tasks with status [future]

## Recent Completed Context

1. [done] Create implementation plan for web-based Z-machine interpreter
   - Documented in IMPLEMENTATION_PLAN.md
   - Covers architecture, phases, technical challenges, testing strategy

2. [done] Research open-source Z-machine parsers
   - Documented in OPEN_SOURCE_RESEARCH.md
   - Found 3 major JavaScript implementations (ifvms.js, jszm, zmach)
   - ifvms.js (97 stars) recommended: MIT licensed, production-ready, used on iplayif.com
   - Recommended approach: Hybrid (build from scratch while using ifvms.js as reference)

3. [done] Study Z-Machine Standard 1.1 - File Format & Z3 Specifics
   - Reviewed official specification sections for memory, routines, objects, dictionary, and opcode tables
   - Documented Z3 header format and memory layout in `docs/Z3_ENGINE_FORMAT_SUMMARY.md`
   - Added V3 opcode/data-structure reference guide linked to The Lurking Horror `.z3` file mapping
   - Indexed new docs in `README.md`

## Pending Tasks

4. [pending] Analyze ifvms.js architecture and core algorithms
   - Study file parser implementation
   - Document opcode handlers and VM instruction execution
   - Identify patterns suitable for our single-file implementation
   - Note: Use as reference, not direct port

5. [pending] Design Phase 1 implementation (Foundation)
   - Based on standards and ifvms.js patterns
   - Finalize file parser design
   - Opcode set to implement in phase 1
   - Memory management strategy
   - Create updated architecture diagram

6. [pending] Phase 1: Build Z3 file parser
   - Parse header and extract metadata
   - Load memory sections from Z3 file
   - Extract and validate dictionary
   - Build initial memory model
   - Unit tests for parser correctness

7. [pending] Phase 1: Implement Z-machine VM core
   - Create instruction decoder
   - Implement basic opcodes (arithmetic, logic, stack, memory)
   - Build call stack and variable management
   - Simple branching support
   - Unit tests for each opcode category

8. [pending] Phase 1: Create HTML/CSS UI framework
   - Single-file or minimal modular structure
   - Game text output window (scrollable)
   - Command input field with history
   - Status line display
   - Responsive design

9. [pending] Phase 1: Implement I/O system
   - Connect VM to UI (text output)
   - Command input and parsing
   - Game loop (read-execute-output cycle)
   - Buffer management

10. [pending] Phase 1: Integration test
   - Load The Lurking Horror Z3 file
   - Execute startup sequence
   - Display initial game state
   - Test basic command processing
   - Verify output matches expectations

## Refinements

nnn. [refine] None. Remove this when we get our first task in this section.

## Future Tasks

nnn. [future] None. Remove this when we get our first task in this section.
