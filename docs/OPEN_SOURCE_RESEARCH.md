# Open Source Z-Machine Parser Research

## Overview
This document summarizes research on existing open-source Z-machine interpreters available on GitHub, focusing on their approaches, features, and suitability for our web-based implementation.

## Key Finding
**Building from scratch vs. using existing code is a strategic decision.** Existing implementations offer significant advantages in validation and correctness, but may come with architectural constraints.

---

## Top 3 JavaScript Z-Machine Interpreters

### 1. **ifvms.js** (RECOMMENDED)
**Repository**: https://github.com/curiousdannii/ifvms.js  
**Stars**: 97  
**License**: MIT  
**Language**: JavaScript  
**Latest Commit**: 8 months ago (January 2026)  
**Status**: Actively maintained

#### Key Features
- **Comprehensive VM**: Supports Z-Machine versions 3-8 (Z3, Z4, Z5, Z6, Z7, Z8)
- **JIT Compilation**: Uses just-in-time disassembler/compiler with Abstract Syntax Tree (AST)
- **Third-generation VM**: Following Gnusto and Quixe, with advanced optimizations
- **Production-proven**: Used by:
  - **Parchment** - web-based IF interpreter (iplayif.com)
  - **Lectrote** - desktop interpreter
  - Multiple other projects
- **Well-tested**: Referenced in issue tracking shows active debugging (Issue #87 about ROM handling)
- **ES6+ JavaScript**: Modern code patterns

#### Architecture Highlights
- **JIT Disassembler**: Converts Z-code to an AST before execution
- **Idiom Recognition**: Attempts to identify Inform-style loops and maps them to JavaScript control structures
- **Lower Overhead**: Longer JIT execution windows = higher performance
- **Terminal Interpreter**: Can also be used via CLI (`zvm story.z5`)

#### Advantages
- ✅ Battle-tested in production (iplayif.com)
- ✅ Recently maintained (8 months ago)
- ✅ Comprehensive Z-machine support
- ✅ MIT licensed - permissive for reuse
- ✅ Multiple reference implementations to learn from
- ✅ Well-documented usage

#### Disadvantages
- ❌ Large codebase (may be complex to understand initially)
- ❌ Not specifically designed for single-file distribution
- ❌ AST generation adds complexity vs. direct interpretation

#### Learning Potential
⭐⭐⭐⭐⭐ Studying ifvms.js would teach:
- Proper Z-machine opcode handling
- Modern VM architecture patterns
- JIT compilation techniques
- Real-world testing scenarios

---

### 2. **jszm** (SMALLEST)
**Repository**: https://github.com/DLehenbauer/jszm  
**Stars**: 15  
**License**: Public Domain  
**Language**: JavaScript/ES6  
**Latest Commit**: 9 years ago  
**Status**: Dormant but stable

#### Key Features
- **Minimal implementation**: Tiny, readable codebase
- **License**: Public domain (no restrictions)
- **Single file**: Can be used as a reference

#### Architecture Highlights
- **Direct interpretation**: No JIT, simple opcode switch/case
- **Straightforward**: Good for understanding core concepts
- **Support**: Supports core Z-machine features

#### Advantages
- ✅ Very small, easy to understand
- ✅ Public domain - can be modified freely
- ✅ Good learning reference
- ✅ Simple memory model

#### Disadvantages
- ❌ Not actively maintained (9 years old)
- ❌ Limited testing across different games
- ❌ Basic performance characteristics
- ❌ Unknown coverage of edge cases

#### Learning Potential
⭐⭐⭐⭐ Good for:
- Understanding core Z-machine concepts
- Learning direct interpretation approach
- Readable example implementation

---

### 3. **zmach** (NOVEL APPROACH)
**Repository**: https://github.com/kmill/zmach  
**Stars**: 9  
**License**: Unlicensed (appears to be public)  
**Language**: JavaScript  
**Latest Updated**: 10 years ago  
**Status**: Archival interest

#### Key Features
- **Dynamic recompilation**: Converts Z-code to JavaScript on-the-fly
- **Novel continuation technique**: Exception-based stack reification for blocking I/O
- **Z5 only**: Limited to version 5 (not suitable for Z3)

#### Architecture Highlights
- **Bytecode to JavaScript**: Decompiles Z-code directly to JavaScript functions
- **Continuation handling**: Uses try-catch for async I/O (research novelty)
- **Relooper algorithm**: Emscripten-inspired loop reconstruction

#### Advantages
- ✅ Novel architectural approach
- ✅ Interesting for understanding JIT techniques
- ✅ Performance potential via full JavaScript optimization

#### Disadvantages
- ❌ Very old (10 years)
- ❌ Z5 only - won't work with Z3 (our format)
- ❌ Appears incomplete/experimental
- ❌ Not production-tested for Z3

#### Learning Potential
⭐⭐⭐ Interesting for:
- Understanding JIT and dynamic recompilation
- Novel async I/O handling patterns
- Not suitable as primary implementation reference

---

## Other Notable Projects

| Project | Stars | Language | Status | Notes |
|---------|-------|----------|--------|-------|
| z-apparatus | 2 | JavaScript | Dormant | Z3/Z5 support, educational |
| voxam-zmachine | 0 | JavaScript | Active (8 days) | Minimal interpreter |
| zwalker | 1 | JavaScript/Python | Active (13 days) | AI walkthrough generator with CZECH interpreter |
| speech_z3 | 0 | JavaScript | Dormant (2021) | Speech-based control only |
| zmachinejs | 2 | JavaScript | Very old (2014) | Web-based interpreter attempt |

---

## Z-Machine Specification Resources

### Official Z-Machine Standard
**Source**: https://www.inform-fiction.org/zmachine/standards/

- **Z-Machine Standard 1.1** (May 2006, revised February 2014)
  - 9th revision, most comprehensive
  - Available as web edition
  - PDF version available (500KB zipped)
- **Z-Machine Standard 1.0** (May 1997)
  - Original standard, still valid

### Content Coverage
- **Header format**: Memory size, version, entry point
- **Memory layout**: Static, dynamic, and execution areas
- **Opcode architecture**: Full instruction set for all Z-machine versions
- **Object system**: Tree structure with properties and attributes
- **Strings and dictionaries**: Text encoding and word lookup
- **I/O system**: Input/output handling
- **File format**: Where to find everything in a Z-file

### Related Standards (also documented)
- **Quetzal**: Save game format (cross-platform)
- **Blorb**: Resource container format
- **Treaty of Babel**: Metadata standard

---

## Comparative Analysis

### Recommendation Summary

| Criterion | ifvms.js | jszm | zmach |
|-----------|----------|------|-------|
| Production-ready | ✅ Yes | ⚠ Untested | ❌ No |
| Z3 Support | ✅ Yes | ✅ Yes | ❌ Z5 only |
| Maintenance | ✅ Active | ❌ Dormant | ❌ Archived |
| Code clarity | ⚠ Medium | ✅ High | ⚠ Complex |
| Performance | ✅ Excellent | ⚠ Adequate | ⚠ Experimental |
| Learning value | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| For our project | **Use as reference** | Use for concepts | Use as research only |

---

## Strategic Options for Our Project

### Option 1: Build from Scratch (Original Plan)
**Pros:**
- Full understanding of every component
- Custom optimizations for single-file distribution
- Educational value - learn Z-machine internals thoroughly
- No external dependency management
- Incremental implementation via phases

**Cons:**
- Time-intensive (3-4 months estimated)
- Risk of missing edge cases
- Reimplementing proven algorithms

**When to choose**: If goal is learning or custom requirements (e.g., web page UX with modern UI toolkit).

---

### Option 2: Study & Adapt ifvms.js
**Pros:**
- Proven correctness (used on iplayif.com)
- Modern JavaScript patterns
- Can extract core logic and simplify for web
- MIT licensed (commercial-safe)
- Learn from battle-tested implementation

**Cons:**
- AST/JIT complexity may be overkill for single-file distro
- Need to refactor for simpler deployment
- Dependency on understanding their architecture first

**When to choose**: If primary goal is a working, playable game quickly.

---

### Option 3: Hybrid Approach
**Pros:**
- Start with ifvms.js architecture to understand the domain
- Implement core pieces based on their patterns
- Use Z-machine standard for validation
- Get best of both worlds

**Cons:**
- Requires understanding both approaches
- More complex planning

**When to choose**: Best balance for learning + pragmatism.

---

## Recommended Next Steps

### Phase 0: Research & Validation (This Task)
1. ✅ Review existing implementations (completed)
2. ⏳ Study Z-Machine Standard 1.1 (sections on file format and opcodes)
3. ⏳ Extract key algorithms from ifvms.js (jszm for simplicity)
4. ⏳ Create a "lessons learned" document

### If Building from Scratch
1. Use ifvms.js as reference for:
   - Opcode implementations
   - Memory management patterns
   - Testing edge cases
2. Use jszm for learning direct interpretation
3. Follow Z-Machine Standard 1.1 rigorously

### If Adapting Existing Code
1. License check: ifvms.js is MIT - compatible
2. Extract Z-Machine VM core from ifvms.js
3. Simplify JIT compiler for single-file output
4. Wire to custom UI/IO

---

## Key Insights

### 1. Single-File Distribution Challenge
Current implementations (ifvms.js, others) are modular projects with separate source files. For single-file HTML:
- Bundle all code into inline JavaScript
- Consider webpack/bundler for production
- Or implement minimal version directly

### 2. Z3-Specific Features to Implement
Our game file is **The Lurking Horror (Z3)** - a 1987 Infocom game:
- Z3 is well-documented in the standard
- Simpler than later versions (Z5, Z6)
- Lower memory footprint
- All core interpreter exists in reference implementations

### 3. Validation Strategy
Must test against:
- Original game behavior (play through manually)
- Compare output with reference interpreters
- Use official test cases if available

---

## Conclusion

**Recommended approach: Hybrid (Option 3)**

1. **Start**: Build from scratch using ifvms.js as reference
2. **Validate**: Cross-check implementations with Z-Machine Standard 1.1
3. **Reuse**: Feel free to port algorithms directly from ifvms.js (MIT license)
4. **Test**: Run against The Lurking Horror and compare output

This balances:
- ✅ Learning the domain thoroughly
- ✅ Time efficiency (reference implementations available)
- ✅ Code quality (proven patterns)
- ✅ Single-file distribution goal
- ✅ no external runtime dependencies

---

## References

### Code References
- **ifvms.js**: https://github.com/curiousdannii/ifvms.js
- **jszm**: https://github.com/DLehenbauer/jszm

### Standards
- **Z-Machine Standard 1.1**: https://www.inform-fiction.org/zmachine/standards/z1point1/index.html

### Live Examples
- **iplayif.com**: Uses ifvms.js (test The Lurking Horror there)
- **Parchment**: Web-based IF interpreter

---

## Next Task
Based on this research, recommend:
- **Task 2**: Study Z-Machine Standard 1.1 (focus on Z3 section)
- **Task 3**: Extract and document key algorithms from ifvms.js
- **Task 4**: Decide final implementation approach based on findings
