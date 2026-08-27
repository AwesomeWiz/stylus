"""Fixed, bounded faster-whisper adapter for Stylus competitor Reel jobs."""

import argparse
import json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--model", default="base")
    args = parser.parse_args()
    from faster_whisper import WhisperModel

    if args.check:
        print(json.dumps({"available": True}))
        return
    if not args.input:
        raise SystemExit(2)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(args.input, beam_size=1)
    bounded = []
    text = []
    for segment in segments:
        if len(bounded) >= 500:
            break
        value = segment.text.strip()[:1000]
        if value:
            bounded.append({"start": segment.start, "end": segment.end, "text": value})
            text.append(value)
    output = " ".join(text)[:100000]
    print(json.dumps({"text": output, "language": info.language, "duration": info.duration, "segments": bounded}))


if __name__ == "__main__":
    main()
