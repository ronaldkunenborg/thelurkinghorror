import argparse
import pyaudio


FORMATS = [
    ("paInt16", pyaudio.paInt16),
    ("paInt24", pyaudio.paInt24),
    ("paInt32", pyaudio.paInt32),
    ("paFloat32", pyaudio.paFloat32),
]

RATES = [44100, 48000, 96000]


def supports_output_format(pa, device_index, channels, rate, fmt):
    try:
        pa.is_format_supported(
            rate,
            output_device=device_index,
            output_channels=channels,
            output_format=fmt,
        )
        return True
    except Exception:
        return False


def print_device_caps(pa, dev):
    print(f"\nDevice #{dev['index']}: {dev['name']}")
    print(f"  Max output channels: {dev['maxOutputChannels']}")
    print(f"  Default sample rate: {dev['defaultSampleRate']}")

    max_ch = int(dev["maxOutputChannels"])
    if max_ch <= 0:
        print("  Output: not supported")
        return

    channels_to_test = [1, 2]
    if max_ch >= 6:
        channels_to_test.append(6)
    channels_to_test = [c for c in channels_to_test if c <= max_ch]

    for ch in channels_to_test:
        print(f"  Channels {ch}:")
        for rate in RATES:
            ok_formats = [
                name
                for (name, fmt) in FORMATS
                if supports_output_format(pa, dev["index"], ch, rate, fmt)
            ]
            formats_text = ", ".join(ok_formats) if ok_formats else "(none)"
            print(f"    {rate:>6} Hz: {formats_text}")


def main():
    parser = argparse.ArgumentParser(
        description="Show output audio capabilities for PyAudio devices."
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Show all devices (default: only default output device).",
    )
    parser.add_argument(
        "--device",
        type=int,
        default=None,
        help="Specific device index to inspect.",
    )
    args = parser.parse_args()

    pa = pyaudio.PyAudio()
    try:
        if args.device is not None:
            dev = pa.get_device_info_by_index(args.device)
            print_device_caps(pa, dev)
            return

        if args.all:
            count = pa.get_device_count()
            for i in range(count):
                dev = pa.get_device_info_by_index(i)
                if dev.get("maxOutputChannels", 0) > 0:
                    print_device_caps(pa, dev)
            return

        dev = pa.get_default_output_device_info()
        print("Default output device capabilities:")
        print_device_caps(pa, dev)
    finally:
        pa.terminate()


if __name__ == "__main__":
    main()
