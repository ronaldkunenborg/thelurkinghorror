# Z-Machine Web Interpreter Implementation Plan

## Overview
Convert "The Lurking Horror" Infocom Z3 text adventure into a single-page web application (HTML/JavaScript) that runs entirely in the browser.

## Architecture Overview

### 1. Z-Machine Virtual Machine (Core)

The Z-machine is a stack-based virtual machine. Key components:

#### 1.1 File Format Parser (Z3)

- **Input**: Z3 binary file (The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3)
- **Tasks**:
  - Parse Z3 file header (version, memory size, etc.)
  - Extract static memory (game data, dictionary, objects)
  - Load dynamic memory (game state)
  - Parse instruction stream

#### 1.2 Memory Management

- **Static Memory**: Read-only game data (strings, objects, routines)
- **Dynamic Memory**: Game state that changes (object positions, variables, flags)
- **Stack**: Call stack for routine execution and operand stack
- **Implementation**: JavaScript typed arrays (Uint8Array, Uint16Array) for efficient binary data handling

#### 1.3 Game State

Objects to track:

- Global variables (16 16-bit variables)
- Object tree (parent/child/sibling relationships)
- Object properties
- Player inventory
- Game flags and counters

#### 1.4 Instruction Set

Execute Z-machine instruction opcodes:

- Arithmetic (add, sub, mul, div, mod)
- Logic (and, or, not)
- Stack operations (push, pop)
- Memory access (load, store)
- Conditional branching (jump, conditional return)
- Text output (print strings, variable values)
- Input handling (read user commands)
- Routine calls and returns
- Object manipulation (move, remove, test properties)

#### 1.5 Dictionary & Text Processing

- **Dictionary**: Parse game's dictionary for word lookup
- **Encoding**: Handle Z-machine text encoding (compressed strings)
- **Abbreviations**: Support Infocom abbreviation tables
- **Parsing**: Tokenize user input against dictionary

### 2. User Interface

#### 2.1 Display Window

- **Main Output Area**: Scrollable text display

  - Show game text (descriptions, responses)
  - Preserve formatting and spacing
  - Auto-scroll on new text
  - Optional: Support basic styling (bold, emphasis)

#### 2.2 Input Window

- **Command Input**: Single-line text input field
- **Command History**: Ability to recall previous commands (arrow keys)
- **Suggestions**: Optional word completion based on dictionary
- **Submit**: Enter button or Ctrl+Enter

#### 2.3 Status Bar

- Status line (if game uses it): location, health, inventory count, etc.
- Optional: Debug info toggle

#### 2.4 Responsive Design

- Mobile-friendly layout
- Touch-friendly controls
- Desktop and tablet optimization

### 3. Implementation Phases

#### Phase 1: Foundation (MVP)

**Goal**: Minimal playable game

1. **Parser Module**
   - Z3 file parsing
   - Header extraction
   - Memory initialization
   - Basic error handling

2. **VM Core**
   - Instruction decoder
   - Stack operations
   - Basic memory access (load, store variables)
   - Simple arithmetic

3. **Basic I/O**
   - Text output system
   - User input capture
   - Simple command execution loop

4. **HTML/CSS Boilerplate**
   - Single HTML file
   - Basic styling
   - Input/output layout

**Deliverable**: Game boots, shows initial text, accepts basic commands

#### Phase 2: Text & Parsing

**Goal**: Full text rendering and command parsing

1. **Text Processing**
   - Z-string decompression
   - Dictionary lookup
   - Abbreviation tables
   - Grammar parsing (word/verb/noun identification)

2. **Enhanced I/O**
   - Text formatting (line breaks, spacing)
   - Output buffer management
   - Proper command tokenization

3. **Testing**
   - Verify text output matches original game

**Deliverable**: Game text displays correctly, player can interact with basic commands

#### Phase 3: Game Logic

**Goal**: Full Z-machine compatibility

1. **Object System**
   - Object tree traversal
   - Property access
   - Object manipulation (move, remove, test)
   - Parent/child/sibling relationships

2. **Routine Execution**
   - Routine calls with parameters
   - Local variables
   - Return values
   - Nested calls

3. **Advanced Instructions**
   - Conditional branches
   - Loops
   - String operations
   - Advanced memory operations

4. **Game State**
   - Save/load game state
   - Undo support (if game enables it)

**Deliverable**: Game fully playable, all core mechanics work

#### Phase 4: Polish & Optimization

**Goal**: Production-ready

1. **Performance**
   - Instruction execution optimization
   - Memory access caching
   - Efficient text rendering

2. **UI Enhancement**
   - Command history with arrow keys
   - Better status display
   - Responsive design improvements
   - Custom styling

3. **Debugging**
   - Optional debug console
   - Instruction trace (toggle-able)
   - Memory inspector

4. **Documentation**
   - Code comments
   - Architecture documentation
   - User guide

**Deliverable**: Polished, playable web application

## Technical Stack

### Frontend

- **HTML5**: Single file layout
- **CSS3**: Responsive styling, terminal-like aesthetics
- **Vanilla JavaScript (ES6+)**: No framework dependencies
  - Modular structure (classes/modules)
  - TypeScript (optional, for type safety)

### Deployment

- Single `.html` file for maximum portability
- Alternative: HTML + CSS + JS bundled together
- Can be served from any web server or local filesystem
- No backend required

## File Structure (After Implementation)

```
thelurkinghorror/
├── app/
│   ├── AGENTS.md              # Project rules
│   ├── TASKS.md               # Task tracking
│   ├── IMPLEMENTATION_PLAN.md  # This document
│   ├── data/
│   │   └── The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3
│   └── src/
│       ├── index.html         # Single HTML file with embedded CSS/JS
│       │                       # (or separate files if modular)
│       ├── z-machine.js       # VM core
│       ├── parser.js          # Z3 file parser
│       ├── text-processor.js  # Text decompression & processing
│       ├── io.js              # Input/output handling
│       └── ui.js              # User interface
```

## Key Technical Challenges & Solutions

### Challenge 1: Binary Data Handling

- **Solution**: Use JavaScript typed arrays (Uint8Array, Uint16Array) for efficient binary access
- Reference: [Z3 File Format](resources/z3-format.md) (to be researched)

### Challenge 2: Text Compression

- **Solution**: Implement Z-compression algorithm (Huffman-like compression)
- Z-strings are variable-length packed numbers with abbreviation support

### Challenge 3: Instruction Decoding

- **Solution**: Create instruction lookup table mapping opcodes to handler functions
- Use performant switch/case or Map structure

### Challenge 4: Stack Management

- **Solution**: Use JavaScript arrays with push/pop for stack operations
- Maintain separate stacks for call stack and evaluation stack

### Challenge 5: User Input Parsing

- **Solution**: Implement Z-machine word parser
- Match player input against game dictionary
- Handle multiple word formats (verbs, nouns, pronouns)

## Testing Strategy

### Unit Tests

- Parser: Verify Z3 file parsing correctness
- VM Instructions: Test individual opcode implementations
- Text Processing: Verify string decompression
- Parsing: Verify word tokenization

### Integration Tests

- Game state: Verify objects move correctly
- Routines: Verify function calls work
- Variables: Verify game variables update correctly

### Acceptance Tests

- Play through game content
- Verify playability matches original Infocom version
- Test all game-specific commands

## Performance Metrics (Goals)

- Game loads in < 2 seconds
- Command response time < 100ms
- Memory footprint < 10MB
- Smooth scrolling and text rendering

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Z3 format complexity | Medium | High | Early prototype with minimal test coverage |
| Text compression bugs | Medium | High | Extract reference docs, implement test cases |
| Performance issues | Low | Medium | Profile early, optimize hot paths |
| Browser compatibility | Low | Low | Target modern browsers (ES6+) |

## Success Criteria

1. ✓ Game boots and displays initial text
2. ✓ Player input is accepted and processed
3. ✓ Game logic executes correctly
4. ✓ Game is fully playable to completion
5. ✓ Single-file (or minimal files) distribution
6. ✓ Works in modern browsers (Chrome, Firefox, Safari, Edge)
7. ✓ No external dependencies

## Dependencies

- **None** (vanilla JavaScript only)
- Browser must support:
  - ES6 (or transpile for older browsers)
  - Typed Arrays (Uint8Array, Uint16Array)
  - Canvas or DOM for rendering (use DOM for simplicity)

## Timeline Estimate

- Phase 1 (Foundation): 4-6 weeks
- Phase 2 (Text & Parsing): 2-3 weeks
- Phase 3 (Game Logic): 4-6 weeks
- Phase 4 (Polish): 2-3 weeks
- **Total**: ~3-4 months (assuming part-time)

## Next Steps

1. Research Z3 file format specification in detail
2. Create initial parser prototype
3. Build basic VM instruction executor
4. Implement simple I/O
5. Test with first 30 seconds of game play
