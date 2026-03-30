#!/usr/bin/env python3
"""Analyze reachable Z3 sound_effect opcode usage from story entrypoint."""

from __future__ import annotations

from collections import Counter, deque
from pathlib import Path


STORE_OPCODES = {8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 129, 130, 131, 132, 136, 142, 143, 224, 231}
BRANCH_OPCODES = {1, 2, 3, 4, 5, 6, 7, 10, 128, 129, 130}
PRINTER_OPCODES = {178, 179}
CALL_OPCODES = {25, 26, 136, 224}
RETURN_OPCODES = {139, 176, 177, 184}
TERMINAL_OPCODES = RETURN_OPCODES | {186}
SOUND_OPCODE = 245


def read_u16(data: bytes, off: int) -> int:
    return ((data[off] << 8) | data[off + 1]) & 0xFFFF


def s16(v: int) -> int:
    v &= 0xFFFF
    return v - 0x10000 if v & 0x8000 else v


def signed14(v: int) -> int:
    v &= 0x3FFF
    return v - 0x4000 if v & 0x2000 else v


def decode_inst(data: bytes, pc: int):
    if pc < 0 or pc >= len(data):
        return None
    offset = pc
    cursor = pc
    code = data[cursor]
    cursor += 1

    if code == 190:
        if cursor + 1 >= len(data):
            return None
        opcode = 1000 + data[cursor]
        cursor += 1
        tbyte = data[cursor]
        cursor += 1
        operand_types = []
        for i in range(4):
            t = (tbyte >> (6 - i * 2)) & 0x03
            if t != 3:
                operand_types.append(t)
    elif code & 0x80:
        if code & 0x40:
            is_var_form = bool(code & 0x20)
            low5 = code & 0x1F
            opcode = 224 + low5 if is_var_form else low5
            if cursor >= len(data):
                return None
            tbyte = data[cursor]
            cursor += 1
            operand_types = []
            for i in range(4):
                t = (tbyte >> (6 - i * 2)) & 0x03
                if t != 3:
                    operand_types.append(t)
        else:
            short_type = (code >> 4) & 0x03
            low4 = code & 0x0F
            if short_type == 3:
                opcode = 176 + low4
                operand_types = []
            else:
                opcode = 128 + low4
                operand_types = [short_type]
    else:
        opcode = code & 0x1F
        operand_types = [2 if (code & 0x40) else 1, 2 if (code & 0x20) else 1]

    operands = []
    for ot in operand_types:
        if ot == 0:
            if cursor + 1 >= len(data):
                return None
            raw = read_u16(data, cursor)
            cursor += 2
            operands.append({"type": "large", "raw": raw})
        elif ot in (1, 2):
            if cursor >= len(data):
                return None
            raw = data[cursor]
            cursor += 1
            operands.append({"type": "small" if ot == 1 else "variable", "raw": raw})
        else:
            return None

    store_var = None
    if opcode in STORE_OPCODES:
        if cursor >= len(data):
            return None
        store_var = data[cursor]
        cursor += 1

    branch = None
    if opcode in BRANCH_OPCODES:
        if cursor >= len(data):
            return None
        b1 = data[cursor]
        cursor += 1
        if_true = bool(b1 & 0x80)
        if b1 & 0x40:
            off = b1 & 0x3F
        else:
            if cursor >= len(data):
                return None
            b2 = data[cursor]
            cursor += 1
            off = signed14(((b1 & 0x3F) << 8) | b2)
        branch = {"ifTrue": if_true, "offset": off}

    if opcode in PRINTER_OPCODES:
        while True:
            if cursor + 1 >= len(data):
                return None
            w = read_u16(data, cursor)
            cursor += 2
            if w & 0x8000:
                break

    return {
        "offset": offset,
        "opcode": opcode,
        "operands": operands,
        "storeVar": store_var,
        "branch": branch,
        "nextPc": cursor,
    }


def routine_entry_to_first_pc(data: bytes, packed_addr: int) -> int | None:
    if packed_addr == 0:
        return None
    ra = packed_addr * 2
    if ra < 0 or ra >= len(data):
        return None
    locals_count = data[ra]
    if locals_count > 15:
        return None
    first_pc = ra + 1 + (locals_count * 2)
    if first_pc < 0 or first_pc >= len(data):
        return None
    return first_pc


def operand_const_value(op):
    if op is None:
        return None
    if op["type"] in ("large", "small"):
        return op["raw"]
    return None


def analyze(data: bytes, initial_pc: int):
    q = deque([initial_pc])
    seen_pc = set()
    sound_calls = []

    while q:
        pc = q.popleft()
        if pc in seen_pc or pc < 0 or pc >= len(data):
            continue
        seen_pc.add(pc)

        inst = decode_inst(data, pc)
        if inst is None:
            continue

        op = inst["opcode"]
        operands = inst["operands"]
        next_pc = inst["nextPc"]

        if op == SOUND_OPCODE:
            sound_calls.append(inst)

        if op in CALL_OPCODES and operands:
            routine_packed = operand_const_value(operands[0])
            if routine_packed is not None:
                first_pc = routine_entry_to_first_pc(data, routine_packed)
                if first_pc is not None:
                    q.append(first_pc)

        if op in TERMINAL_OPCODES:
            continue

        if op == 140 and operands:
            jump_val = operand_const_value(operands[0])
            if jump_val is not None:
                q.append(next_pc + s16(jump_val) - 2)
            continue

        if inst["branch"] is not None:
            q.append(next_pc)
            boff = inst["branch"]["offset"]
            if boff not in (0, 1):
                q.append(next_pc + boff - 2)
            continue

        q.append(next_pc)

    return sound_calls


def main():
    path = Path("app/data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3")
    data = path.read_bytes()
    initial_pc = read_u16(data, 0x06)
    calls = analyze(data, initial_pc)

    effect_counter = Counter()
    number_counter = Counter()
    volume_literals = []
    volume_var = 0

    rows = []
    for inst in calls:
        ops = inst["operands"]
        number = operand_const_value(ops[0]) if len(ops) > 0 else None
        effect = operand_const_value(ops[1]) if len(ops) > 1 else None
        volume = operand_const_value(ops[2]) if len(ops) > 2 else None
        routine = operand_const_value(ops[3]) if len(ops) > 3 else None
        if effect is not None:
            effect_counter[effect] += 1
        if number is not None:
            number_counter[number] += 1
        if volume is not None:
            volume_literals.append(volume)
        elif len(ops) > 2 and ops[2]["type"] == "variable":
            volume_var += 1
        rows.append((inst["offset"], number, effect, volume, routine, [o["type"] for o in ops]))

    print(f"reachable_sound_effect_calls: {len(calls)}")
    print(f"effect_codes_literal: {sorted(effect_counter.items())}")
    if number_counter:
        print(f"sound_number_literal_minmax: {(min(number_counter), max(number_counter))}")
        print(f"sound_number_literal_distinct: {sorted(number_counter.keys())}")
    else:
        print("sound_number_literal_minmax: none")
    if volume_literals:
        print(f"volume_literal_minmax: {(min(volume_literals), max(volume_literals))}")
        print(f"volume_literal_distinct: {sorted(set(volume_literals))}")
    else:
        print("volume_literal_minmax: none")
    print(f"volume_variable_operand_count: {volume_var}")

    print("\\nreachable call sites:")
    for off, n, e, v, r, types in rows:
        vtxt = "var" if v is None and len(types) > 2 and types[2] == "variable" else v
        print(f"  0x{off:05x} n={n} e={e} v={vtxt} r={r} types={types}")


if __name__ == "__main__":
    main()
