# Product media

These assets show the actual production-built Stylus application, captured on
2026-11-15 in Chromium at 1600×900. Paper Orbit, its three team members, research,
results and work are fictional. The maintainer authorized one isolated demo
organization on the development backend. No AI, external provider or real customer
content was used. Capture credentials, browser profiles and exact fixture IDs stay
in ignored local storage and are excluded from the repository.

Eight PNG screenshots cover Home, Tasks, Boards in both themes, Hypothesis,
Experiment, Research and Integrations. Integrations truthfully shows configuration
states without connected personal resources. Authored fictional research is not
presented as a successful model/provider run. Every screenshot and the animation
contact sheets were visually reviewed for private data, credentials, debug clutter
and current UI. There is no browser chrome, HTML product mock or painted-over UI.

| Asset                                                     | Dimensions      |     Bytes |
| --------------------------------------------------------- | --------------- | --------: |
| [Home](media/home.png)                                    | 1600×900        |   108,955 |
| [Tasks](media/tasks.png)                                  | 1600×900        |   181,496 |
| [Board](media/board.png)                                  | 1600×900        |    96,213 |
| [Board, dark](media/board-dark.png)                       | 1600×900        |    95,106 |
| [Hypothesis](media/hypothesis.png)                        | 1600×900        |   102,183 |
| [Experiment](media/experiment.png)                        | 1600×900        |   105,242 |
| [Research](media/research.png)                            | 1600×900        |    79,504 |
| [Integrations](media/integrations.png)                    | 1600×900        |   103,036 |
| [Operating loop GIF](media/operating-loop.gif)            | 1280×720, 7.44s |   603,522 |
| [Boards GIF](media/boards.gif)                            | 1280×720, 6.96s |   218,611 |
| [Operating loop master](media/operating-loop-master.webm) | 1600×900        | 1,460,859 |
| [Boards master](media/boards-master.webm)                 | 1600×900        |   274,378 |

The operating loop follows real links through Evidence, Hypothesis, Experiment,
Task and Learning. Boards demonstrates real drag creation, a canonical Task card
and its menu. A small neutral capture pointer identifies actual pointer positions;
it hides when Stylus's own placement crosshair appears. No artificial zoom or
impossible product state is introduced. Playback timing is edited with deliberate
holds for reading; these clips are demonstrations, not latency measurements.

Playwright 1.65.0 captures original PNG frames. Sharp 0.35.5 resizes GIF derivatives;
gifenc 1.0.3 uses a shared 255-color palette, transparent frame deltas and 120ms
frames. The two GIFs contain 62 and 58 frames. The bundled Playwright FFmpeg encoder
accepts JPEG100/4:4:4 transport frames and encodes VP9 in lossless mode; the WebM
files are high-quality masters, not bit-for-bit copies of the PNG originals.
Original PNG sequences remain private QA artifacts. No music, stock media or
proprietary reference assets are included. See [asset provenance](ASSET_PROVENANCE.md).

Animation SHA-256:

```text
operating-loop.gif  096a5748bd9f6e1a827c1740178cef9d6b41304d38c561bb1a6450297e37a785
boards.gif         40451735450d4a65efeafef912d4ac7446ba8fe2528983d24c722a27cbd0d0ca
operating-loop-master.webm  0981b091250b1a453060afe120dfef29e7f1cd1ce4e808e0898d755197cd32cf
boards-master.webm  90675f7fc34fee23c7fe41378c51335787e0ecda696720758b2a740b6305fab7
```
