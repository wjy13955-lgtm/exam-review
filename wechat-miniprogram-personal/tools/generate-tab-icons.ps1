Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $PSScriptRoot "..\assets\tabbar"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function New-Icon([string]$name, [string]$color) {
  $size = 81
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($color), 5)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  switch ($name) {
    "dashboard" {
      $points = [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(15, 38),
        [System.Drawing.Point]::new(40, 17),
        [System.Drawing.Point]::new(66, 38)
      )
      $graphics.DrawLines($pen, $points)
      $graphics.DrawLine($pen, 21, 34, 21, 65)
      $graphics.DrawLine($pen, 21, 65, 60, 65)
      $graphics.DrawLine($pen, 60, 65, 60, 34)
    }
    "plan" {
      $graphics.DrawRectangle($pen, 15, 20, 51, 46)
      $graphics.DrawLine($pen, 15, 34, 66, 34)
      $graphics.DrawLine($pen, 28, 14, 28, 26)
      $graphics.DrawLine($pen, 53, 14, 53, 26)
      $graphics.FillEllipse($brush, 26, 43, 6, 6)
      $graphics.FillEllipse($brush, 38, 43, 6, 6)
      $graphics.FillEllipse($brush, 50, 43, 6, 6)
      $graphics.FillEllipse($brush, 26, 54, 6, 6)
      $graphics.FillEllipse($brush, 38, 54, 6, 6)
    }
    "record" {
      $graphics.DrawRectangle($pen, 17, 15, 47, 52)
      $graphics.DrawLine($pen, 28, 30, 54, 30)
      $graphics.DrawLine($pen, 28, 42, 54, 42)
      $graphics.DrawLine($pen, 28, 54, 45, 54)
    }
    "review" {
      $graphics.DrawArc($pen, 16, 16, 49, 49, 35, 285)
      $graphics.DrawLine($pen, 61, 18, 62, 34)
      $graphics.DrawLine($pen, 62, 34, 47, 31)
      $graphics.DrawLine($pen, 32, 40, 39, 47)
      $graphics.DrawLine($pen, 39, 47, 52, 32)
    }
    "mock" {
      $graphics.DrawLine($pen, 17, 66, 66, 66)
      $graphics.DrawLine($pen, 17, 66, 17, 17)
      $graphics.DrawLine($pen, 25, 55, 36, 43)
      $graphics.DrawLine($pen, 36, 43, 47, 49)
      $graphics.DrawLine($pen, 47, 49, 63, 27)
      $graphics.FillEllipse($brush, 22, 52, 6, 6)
      $graphics.FillEllipse($brush, 33, 40, 6, 6)
      $graphics.FillEllipse($brush, 44, 46, 6, 6)
      $graphics.FillEllipse($brush, 60, 24, 6, 6)
    }
  }

  $fileName = if ($color -eq "#6475ad") { "$name-active.png" } else { "$name.png" }
  $bitmap.Save((Join-Path $outputDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $brush.Dispose()
  $pen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$icons = @("dashboard", "plan", "record", "review", "mock")
foreach ($icon in $icons) {
  New-Icon $icon "#737b75"
  New-Icon $icon "#6475ad"
}
