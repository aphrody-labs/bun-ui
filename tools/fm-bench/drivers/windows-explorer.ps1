<#
  fm-bench Windows Explorer driver (UI Automation + process metrics, no ETW).

  Scenario "open-folder": for each run
    1. snapshot existing CabinetWClass windows and explorer.exe memory;
    2. start a stopwatch and launch `explorer.exe <folder>`;
    3. poll UIA for a new CabinetWClass top-level window      -> windowMs;
    4. poll the shell view (UIItemsView) for its first ListItem -> firstItemMs;
    5. poll the status bar item count (MetadataLabel, locale-independent digit
       parse) until it reaches the expected count             -> itemsMs;
    6. after a settle delay, read working set / private bytes of the process
       that owns the window (and the delta versus step 1), then WM_CLOSE it.

  Output: one JSON document on stdout (consumed by drivers/windows.ts).
  Requirements: Windows PowerShell 5.1 (UIAutomationClient), an interactive
  desktop session. No installation, no admin rights.
#>
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [int]$ExpectedItems = 0,
  [int]$Runs = 5,
  [int]$TimeoutSec = 60,
  [int]$SettleMs = 1500,
  [int]$PollMs = 5
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class FmBenchUser32 {
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
}
"@

$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$root = $AE::RootElement
$cabinetCond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'CabinetWClass')
$itemsViewCond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'UIItemsView')
$metaCond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'MetadataLabel')
$listItemCond = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::ListItem)
$script:statusLabel = $null

function Get-CabinetHandles {
  $set = @{}
  foreach ($w in $root.FindAll($TS::Children, $cabinetCond)) { $set[[int64]$w.Current.NativeWindowHandle] = $true }
  return $set
}

function Get-ItemCount($view, $window) {
  # 1) Status bar total ("10,000 items" and its localized forms): digits of the
  #    leading number. The label element is cached after the first hit.
  try {
    if (-not $script:statusLabel) { $script:statusLabel = $window.FindFirst($TS::Descendants, $metaCond) }
    if ($script:statusLabel) {
      $name = $script:statusLabel.Current.Name
      if ($name -match '^\s*(\d[\d\s  .,]*)') {
        $digits = ($Matches[1] -replace '[^\d]', '')
        if ($digits.Length -gt 0) { return @{ count = [int]$digits; source = 'StatusBar.MetadataLabel' } }
      }
    }
  } catch { $script:statusLabel = $null }
  # 2) Realized list items. The view is virtualized, so this is only a lower
  #    bound and never satisfies the "listing complete" condition.
  try {
    $n = $view.FindAll($TS::Children, $listItemCond).Count
    return @{ count = [int]$n; source = 'RealizedListItems' }
  } catch {}
  return @{ count = 0; source = 'none' }
}

function Get-ExplorerMemory {
  $m = @{}
  foreach ($p in Get-Process -Name explorer -ErrorAction SilentlyContinue) { $m[$p.Id] = @{ ws = $p.WorkingSet64; priv = $p.PrivateMemorySize64 } }
  return $m
}

$results = @()
for ($run = 1; $run -le $Runs; $run++) {
  $script:statusLabel = $null
  $before = Get-CabinetHandles
  $memBefore = Get-ExplorerMemory
  $window = $null; $hwnd = [IntPtr]::Zero; $ownerPid = 0
  $windowMs = $null; $firstItemMs = $null; $itemsMs = $null; $view = $null; $count = @{ count = 0; source = 'none' }

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Start-Process -FilePath 'explorer.exe' -ArgumentList ('"{0}"' -f $Path) | Out-Null
  $deadline = $TimeoutSec * 1000

  while ($sw.ElapsedMilliseconds -lt $deadline -and -not $window) {
    foreach ($w in $root.FindAll($TS::Children, $cabinetCond)) {
      $h = [int64]$w.Current.NativeWindowHandle
      if (-not $before.ContainsKey($h)) {
        $window = $w; $windowMs = $sw.Elapsed.TotalMilliseconds
        $hwnd = [IntPtr]$h; $ownerPid = [int]$w.Current.ProcessId
        break
      }
    }
    if (-not $window) { Start-Sleep -Milliseconds $PollMs }
  }
  if (-not $window) { $results += [ordered]@{ run = $run; error = 'window-timeout' }; continue }

  while ($sw.ElapsedMilliseconds -lt $deadline -and [FmBenchUser32]::IsWindow($hwnd)) {
    if (-not $view) { try { $view = $window.FindFirst($TS::Descendants, $itemsViewCond) } catch {} }
    if ($view) {
      if (-not $firstItemMs) {
        try { if ($view.FindFirst($TS::Children, $listItemCond)) { $firstItemMs = $sw.Elapsed.TotalMilliseconds } } catch {}
      }
      $count = Get-ItemCount $view $window
      $complete = $count.source -ne 'RealizedListItems' -and $count.count -gt 0 -and
                  ($ExpectedItems -le 0 -or $count.count -ge $ExpectedItems)
      if ($complete) { $itemsMs = $sw.Elapsed.TotalMilliseconds; break }
    }
    Start-Sleep -Milliseconds $PollMs
  }

  Start-Sleep -Milliseconds $SettleMs
  $owner = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
  $known = $memBefore.ContainsKey($ownerPid)
  $wsBefore = if ($known) { $memBefore[$ownerPid].ws } else { 0 }
  $privBefore = if ($known) { $memBefore[$ownerPid].priv } else { 0 }
  $alive = [FmBenchUser32]::IsWindow($hwnd)

  $results += [ordered]@{
    run = $run
    windowMs = [math]::Round($windowMs, 1)
    firstItemMs = if ($firstItemMs) { [math]::Round($firstItemMs, 1) } else { $null }
    itemsMs = if ($itemsMs) { [math]::Round($itemsMs, 1) } else { $null }
    itemCount = $count.count
    itemCountSource = $count.source
    ownerPid = $ownerPid
    ownerIsNewProcess = -not $known
    workingSetBytes = if ($owner) { $owner.WorkingSet64 } else { $null }
    privateBytes = if ($owner) { $owner.PrivateMemorySize64 } else { $null }
    peakWorkingSetBytes = if ($owner) { $owner.PeakWorkingSet64 } else { $null }
    workingSetDeltaBytes = if ($owner) { $owner.WorkingSet64 - $wsBefore } else { $null }
    privateDeltaBytes = if ($owner) { $owner.PrivateMemorySize64 - $privBefore } else { $null }
    windowAliveAtEnd = $alive
    error = if ($itemsMs) { $null } elseif (-not $alive) { 'window-closed-early' } else { 'items-timeout' }
  }

  if ($alive) { [void][FmBenchUser32]::PostMessage($hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) } # WM_CLOSE
  for ($i = 0; $i -lt 300 -and [FmBenchUser32]::IsWindow($hwnd); $i++) { Start-Sleep -Milliseconds 10 }
  Start-Sleep -Milliseconds $SettleMs
}

$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$sep = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name SeparateProcess -ErrorAction SilentlyContinue
[ordered]@{
  driver = 'windows-explorer.ps1'
  path = $Path
  expectedItems = $ExpectedItems
  host = [ordered]@{
    os = $os.Caption
    build = $os.BuildNumber
    cpu = $cpu.Name.Trim()
    logicalCpus = $cpu.NumberOfLogicalProcessors
    ramBytes = [int64]$os.TotalVisibleMemorySize * 1024
    separateProcessSetting = if ($sep) { [bool]$sep.SeparateProcess } else { $false }
  }
  runs = $results
} | ConvertTo-Json -Depth 6
