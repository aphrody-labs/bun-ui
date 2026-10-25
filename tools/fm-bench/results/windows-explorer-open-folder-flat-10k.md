# fm-bench results

Generated 2026-10-25T05:24:07.318Z on Microsoft Windows 11 Famille Insider Preview (build 28120), 13th Gen Intel(R) Core(TM) i7-13700F, 24 logical CPUs, 31.8 GiB RAM, bun 1.4.6.

## windows-explorer / open-folder (windows)

Dataset `flat-10k` (10,000 files, 70.6 MiB, seed 1); 5 runs; warm cache.

| Metric | Median | Min | Max | p90 | Runs | Source |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| windowMs | 472 ms | 441 ms | 1436 ms | 1436 ms | 5 | UI Automation (UIAutomationClient), Stopwatch from Start-Process: new CabinetWClass top-level window |
| firstItemMs | 1077 ms | 998 ms | 1555 ms | 1555 ms | 5 | UI Automation (UIAutomationClient), Stopwatch from Start-Process: first ListItem under UIItemsView |
| itemsMs | 1107 ms | 1020 ms | 1592 ms | 1592 ms | 5 | UI Automation (UIAutomationClient), Stopwatch from Start-Process: status bar MetadataLabel count == expected |
| workingSetBytes | 181.7 MiB | 168.8 MiB | 185.7 MiB | 185.7 MiB | 5 | Get-Process WorkingSet64 of the window's owner process, 1.5 s after listing |
| privateBytes | 131.4 MiB | 113.4 MiB | 134.6 MiB | 134.6 MiB | 5 | Get-Process PrivateMemorySize64 of the owner process |
| peakWorkingSetBytes | 185.7 MiB | 181.7 MiB | 189.1 MiB | 189.1 MiB | 5 | Get-Process PeakWorkingSet64 of the owner process |

Notes:

- owner process new per window in 5/5 runs (SeparateProcess setting: false)
- item count source: StatusBar.MetadataLabel
- warm cache: the OS standby list is not flushed between runs (no admin tools used)

