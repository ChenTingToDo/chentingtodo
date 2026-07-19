param(
    [string]$TestSource,
    [string]$TestSlug,
    [ValidateSet('troubleshooting', 'learning', 'project')]
    [string]$TestType = 'troubleshooting',
    [string]$TestDescription,
    [string]$TestTags,
    [switch]$TestPublish
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
$TsxCli = Join-Path $ProjectRoot 'node_modules\tsx\dist\cli.mjs'
$ArticleTool = Join-Path $ProjectRoot 'scripts\article-tool.ts'
$ArticlePreview = Join-Path $ProjectRoot 'scripts\article-preview.ts'
$DraftsDirectory = Join-Path $ProjectRoot 'content\drafts'
$DraftAssetsDirectory = Join-Path $ProjectRoot 'content\draft-assets'
$ArticlesDirectory = Join-Path $ProjectRoot 'content\articles'
$PublicArticleImagesDirectory = Join-Path $ProjectRoot 'public\images\articles'

if (-not (Test-Path -LiteralPath $TsxCli) -or -not (Test-Path -LiteralPath $ArticleTool)) {
    [System.Windows.Forms.MessageBox]::Show(
        '文章工具依赖尚未安装。请先在项目目录运行一次 npm install，或让 Codex 帮你修复。',
        'ChenTingToDo 文章发布工具',
        'OK',
        'Error'
    ) | Out-Null
    exit 1
}

$script:CurrentSlug = $null
$script:CurrentFile = $null
$script:PreviewProcess = $null
$script:PreviewAssetsDirectory = $null

function ConvertTo-CommandLineArgument {
    param([Parameter(Mandatory)][string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-NodeTool {
    param(
        [Parameter(Mandatory)][string]$ScriptPath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $allArguments = @($TsxCli, $ScriptPath) + $Arguments
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $NodeCommand
    $startInfo.Arguments = ($allArguments | ForEach-Object { ConvertTo-CommandLineArgument $_ }) -join ' '
    $startInfo.WorkingDirectory = $ProjectRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $startInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()

    while (-not $process.WaitForExit(100)) {
        [System.Windows.Forms.Application]::DoEvents()
    }
    $process.WaitForExit()

    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    $combined = (($stdout, $stderr) | Where-Object { $_ }) -join [Environment]::NewLine
    $json = $null
    foreach ($line in ($stdout -split "`r?`n" | Select-Object -Last 30)) {
        if (-not $line.Trim().StartsWith('{')) { continue }
        try { $json = $line | ConvertFrom-Json } catch { }
    }

    [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output = $combined.Trim()
        Data = $json
    }
}

function Stop-ArticlePreview {
    if ($script:PreviewProcess -and -not $script:PreviewProcess.HasExited) {
        & taskkill.exe /PID $script:PreviewProcess.Id /T /F 2>$null | Out-Null
    }
    $script:PreviewProcess = $null
    Remove-PreviewAssets
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()
    return $port
}

function Test-TcpPort {
    param([int]$Port)
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $wait = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        return $wait.AsyncWaitHandle.WaitOne(150) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Remove-PreviewAssets {
    if (-not $script:PreviewAssetsDirectory) { return }
    $target = [System.IO.Path]::GetFullPath($script:PreviewAssetsDirectory)
    $publicRoot = [System.IO.Path]::GetFullPath($PublicArticleImagesDirectory) + [System.IO.Path]::DirectorySeparatorChar
    if ($target.StartsWith($publicRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $target)) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    $script:PreviewAssetsDirectory = $null
}

function Stage-DraftAssetsForPreview {
    param([Parameter(Mandatory)][string]$Slug)
    $source = Join-Path $DraftAssetsDirectory $Slug
    if (-not (Test-Path -LiteralPath $source -PathType Container)) { return }
    $target = Join-Path $PublicArticleImagesDirectory $Slug
    if (Test-Path -LiteralPath $target) {
        throw "图片预览目录已经存在，未覆盖任何文件：$target"
    }
    [void](New-Item -ItemType Directory -Path $PublicArticleImagesDirectory -Force)
    Copy-Item -LiteralPath $source -Destination $target -Recurse
    $script:PreviewAssetsDirectory = $target
}

function Write-Utf8Text {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Text
    )
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Add-CompressedArticleImage {
    param(
        [Parameter(Mandatory)][string]$SourcePath,
        [Parameter(Mandatory)][string]$Slug
    )
    $extension = [System.IO.Path]::GetExtension($SourcePath).ToLowerInvariant()
    if ($extension -notin @('.png', '.jpg', '.jpeg')) {
        throw '第一版支持 PNG、JPG 和 JPEG 图片。请先把其他格式另存为 PNG 或 JPG。'
    }

    $assetDirectory = Join-Path $DraftAssetsDirectory $Slug
    [void](New-Item -ItemType Directory -Path $assetDirectory -Force)
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($SourcePath).ToLowerInvariant()
    $baseName = [regex]::Replace($baseName, '[^a-z0-9]+', '-').Trim('-')
    if (-not $baseName) { $baseName = 'image' }
    if ($baseName.Length -gt 48) { $baseName = $baseName.Substring(0, 48).Trim('-') }
    $outputExtension = if ($extension -eq '.png') { '.png' } else { '.jpg' }
    $index = 1
    do {
        $fileName = ('{0:d2}-{1}{2}' -f $index, $baseName, $outputExtension)
        $destination = Join-Path $assetDirectory $fileName
        $index += 1
    } while (Test-Path -LiteralPath $destination)

    $sourceImage = $null
    $bitmap = $null
    $graphics = $null
    $encoderParameters = $null
    try {
        $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
        $scale = [Math]::Min(1.0, 1600.0 / [Math]::Max($sourceImage.Width, $sourceImage.Height))
        $width = [Math]::Max(1, [int][Math]::Round($sourceImage.Width * $scale))
        $height = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * $scale))
        $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        if ($outputExtension -eq '.jpg') { $graphics.Clear([System.Drawing.Color]::White) }
        else { $graphics.Clear([System.Drawing.Color]::Transparent) }
        $graphics.DrawImage($sourceImage, 0, 0, $width, $height)
        $graphics.Dispose()
        $graphics = $null

        if ($outputExtension -eq '.png') {
            $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
        } else {
            $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
                Where-Object { $_.MimeType -eq 'image/jpeg' } |
                Select-Object -First 1
            $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
            $encoderParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
                [System.Drawing.Imaging.Encoder]::Quality,
                [long]85
            )
            $bitmap.Save($destination, $jpegEncoder, $encoderParameters)
        }
    } catch {
        if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
        throw
    } finally {
        if ($encoderParameters) { $encoderParameters.Dispose() }
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($sourceImage) { $sourceImage.Dispose() }
    }

    [pscustomobject]@{
        FilePath = $destination
        MarkdownUrl = "/images/articles/$Slug/$fileName"
    }
}

function Show-ArticleEditor {
    if (-not $script:CurrentSlug -or -not $script:CurrentFile -or -not (Test-Path -LiteralPath $script:CurrentFile -PathType Leaf)) {
        [void][System.Windows.Forms.MessageBox]::Show('请先导入或打开一篇草稿。', '文章编辑器', 'OK', 'Information')
        return
    }
    $expectedDraft = [System.IO.Path]::GetFullPath((Join-Path $DraftsDirectory "$($script:CurrentSlug).md"))
    if ([System.IO.Path]::GetFullPath($script:CurrentFile) -ne $expectedDraft) {
        Start-Process -FilePath $script:CurrentFile
        return
    }

    $editorForm = [System.Windows.Forms.Form]::new()
    $editorForm.Text = "编辑正文并插图 — $($script:CurrentSlug)"
    $editorForm.StartPosition = 'CenterParent'
    $editorForm.Size = [System.Drawing.Size]::new(1000, 760)
    $editorForm.MinimumSize = [System.Drawing.Size]::new(800, 600)
    $editorForm.Font = [System.Drawing.Font]::new('Microsoft YaHei UI', 9)

    $hint = [System.Windows.Forms.Label]::new()
    $hint.Location = [System.Drawing.Point]::new(15, 12)
    $hint.Size = [System.Drawing.Size]::new(950, 36)
    $hint.Text = '把光标放在希望出现图片的位置，再点击“在光标处插入图片”。图片会自动缩小、清除元数据并保存到当前草稿。'
    $editorForm.Controls.Add($hint)

    $editor = [System.Windows.Forms.RichTextBox]::new()
    $editor.Location = [System.Drawing.Point]::new(15, 52)
    $editor.Size = [System.Drawing.Size]::new(950, 610)
    $editor.Anchor = 'Top,Bottom,Left,Right'
    $editor.Font = [System.Drawing.Font]::new('Consolas', 10)
    $editor.AcceptsTab = $true
    $editor.WordWrap = $false
    $editor.Text = [System.IO.File]::ReadAllText($script:CurrentFile, [System.Text.Encoding]::UTF8)
    $editor.Tag = $editor.Text
    $editorForm.Controls.Add($editor)

    $insertButton = [System.Windows.Forms.Button]::new()
    $insertButton.Location = [System.Drawing.Point]::new(15, 675)
    $insertButton.Size = [System.Drawing.Size]::new(190, 34)
    $insertButton.Anchor = 'Bottom,Left'
    $insertButton.Text = '在光标处插入图片…'
    $editorForm.Controls.Add($insertButton)

    $saveButton = [System.Windows.Forms.Button]::new()
    $saveButton.Location = [System.Drawing.Point]::new(220, 675)
    $saveButton.Size = [System.Drawing.Size]::new(130, 34)
    $saveButton.Anchor = 'Bottom,Left'
    $saveButton.Text = '保存草稿'
    $editorForm.Controls.Add($saveButton)

    $editorStatus = [System.Windows.Forms.Label]::new()
    $editorStatus.Location = [System.Drawing.Point]::new(370, 682)
    $editorStatus.Size = [System.Drawing.Size]::new(430, 25)
    $editorStatus.Anchor = 'Bottom,Left,Right'
    $editorStatus.ForeColor = [System.Drawing.Color]::DimGray
    $editorStatus.Text = '点击正文确定位置后即可插图。'
    $editorForm.Controls.Add($editorStatus)

    $closeButton = [System.Windows.Forms.Button]::new()
    $closeButton.Location = [System.Drawing.Point]::new(835, 675)
    $closeButton.Size = [System.Drawing.Size]::new(130, 34)
    $closeButton.Anchor = 'Bottom,Right'
    $closeButton.Text = '关闭'
    $editorForm.Controls.Add($closeButton)

    $saveButton.Add_Click({
        Write-Utf8Text $script:CurrentFile $editor.Text
        $editor.Tag = $editor.Text
        $editorStatus.Text = "已保存：$(Get-Date -Format 'HH:mm:ss')"
        Write-AppLog "已保存草稿：$($script:CurrentFile)"
    })

    $insertButton.Add_Click({
        $dialog = [System.Windows.Forms.OpenFileDialog]::new()
        $dialog.Filter = '文章图片 (*.png;*.jpg;*.jpeg)|*.png;*.jpg;*.jpeg'
        $dialog.Title = '选择要插入的图片'
        if ($dialog.ShowDialog($editorForm) -ne 'OK') { return }
        $defaultAlt = [System.IO.Path]::GetFileNameWithoutExtension($dialog.FileName)
        $alt = [Microsoft.VisualBasic.Interaction]::InputBox(
            '请用一句短话说明图片内容，例如“Vercel 部署成功结果”。',
            '图片说明',
            $defaultAlt
        ).Trim()
        if (-not $alt) {
            [void][System.Windows.Forms.MessageBox]::Show('图片说明不能为空，本次没有插入图片。', '文章编辑器', 'OK', 'Information')
            return
        }
        $alt = $alt.Replace("`r", ' ').Replace("`n", ' ').Replace(']', '】')
        try {
            $image = Add-CompressedArticleImage $dialog.FileName $script:CurrentSlug
            $markdown = "![$alt]($($image.MarkdownUrl))"
            $prefix = if ($editor.SelectionStart -gt 0 -and $editor.Text[$editor.SelectionStart - 1] -notin @("`r", "`n")) { "`r`n`r`n" } else { '' }
            $suffix = if ($editor.SelectionStart -lt $editor.TextLength -and $editor.Text[$editor.SelectionStart] -notin @("`r", "`n")) { "`r`n`r`n" } else { '' }
            $editor.SelectedText = "$prefix$markdown$suffix"
            $editor.SelectionStart = $editor.SelectionStart
            Write-Utf8Text $script:CurrentFile $editor.Text
            $editor.Tag = $editor.Text
            $editorStatus.Text = "图片已插入并保存：$([System.IO.Path]::GetFileName($image.FilePath))"
            Write-AppLog "已插入图片：$($image.FilePath)"
        } catch {
            [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '插入图片失败', 'OK', 'Error')
        }
    })

    $closeButton.Add_Click({ $editorForm.Close() })
    $editorForm.Add_FormClosing({
        param($sender, $eventArgs)
        if ($editor.Text -ne [string]$editor.Tag) {
            $choice = [System.Windows.Forms.MessageBox]::Show('正文还有未保存修改，是否保存后关闭？', '文章编辑器', 'YesNoCancel', 'Question')
            if ($choice -eq 'Cancel') { $eventArgs.Cancel = $true; return }
            if ($choice -eq 'Yes') { Write-Utf8Text $script:CurrentFile $editor.Text }
        }
    })
    [void]$editorForm.ShowDialog($form)
}

if ($TestSource) {
    $prepareArguments = @('prepare', $TestSource, '--type', $TestType, '--json')
    if ($TestSlug) { $prepareArguments += @('--slug', $TestSlug) }
    if ($TestDescription) { $prepareArguments += @('--description', $TestDescription) }
    if ($TestTags) { $prepareArguments += @('--tags', $TestTags) }
    $prepareResult = Invoke-NodeTool $ArticleTool $prepareArguments
    if ($prepareResult.ExitCode -ne 0 -or -not $prepareResult.Data.ok) {
        Write-Output $prepareResult.Output
        exit 1
    }

    $slug = $prepareResult.Data.slug
    $checkResult = Invoke-NodeTool $ArticleTool @('check', $slug, '--json')
    if ($checkResult.ExitCode -ne 0 -or -not $checkResult.Data.ok) {
        Write-Output $checkResult.Output
        exit 1
    }

    if ($TestPublish) {
        $publishResult = Invoke-NodeTool $ArticleTool @('publish', $slug, '--json')
        Write-Output $publishResult.Output
        exit $publishResult.ExitCode
    }

    Write-Output ($checkResult.Data | ConvertTo-Json -Compress)
    exit 0
}

$form = [System.Windows.Forms.Form]::new()
$form.Text = 'ChenTingToDo 文章发布工具'
$form.StartPosition = 'CenterScreen'
$form.Size = [System.Drawing.Size]::new(820, 780)
$form.MinimumSize = [System.Drawing.Size]::new(820, 780)
$form.Font = [System.Drawing.Font]::new('Microsoft YaHei UI', 9)

$introLabel = [System.Windows.Forms.Label]::new()
$introLabel.Location = [System.Drawing.Point]::new(20, 15)
$introLabel.Size = [System.Drawing.Size]::new(760, 42)
$introLabel.Text = "第一次使用：只需选择 Markdown 原稿，工具会自动推荐类型、摘要和标签。`r`n确认推荐内容后，按 1～4 的顺序操作；最后一步会把文章正式公开到你的网站。"
$form.Controls.Add($introLabel)

$sourceLabel = [System.Windows.Forms.Label]::new()
$sourceLabel.Location = [System.Drawing.Point]::new(20, 58)
$sourceLabel.Size = [System.Drawing.Size]::new(90, 25)
$sourceLabel.Text = 'Markdown 原稿'
$form.Controls.Add($sourceLabel)

$sourceTextBox = [System.Windows.Forms.TextBox]::new()
$sourceTextBox.Location = [System.Drawing.Point]::new(115, 55)
$sourceTextBox.Size = [System.Drawing.Size]::new(555, 25)
$form.Controls.Add($sourceTextBox)

$browseButton = [System.Windows.Forms.Button]::new()
$browseButton.Location = [System.Drawing.Point]::new(680, 53)
$browseButton.Size = [System.Drawing.Size]::new(100, 29)
$browseButton.Text = '选择文件…'
$form.Controls.Add($browseButton)

$typeLabel = [System.Windows.Forms.Label]::new()
$typeLabel.Location = [System.Drawing.Point]::new(20, 100)
$typeLabel.Size = [System.Drawing.Size]::new(70, 25)
$typeLabel.Text = '文章类型'
$form.Controls.Add($typeLabel)

$typeComboBox = [System.Windows.Forms.ComboBox]::new()
$typeComboBox.Location = [System.Drawing.Point]::new(90, 97)
$typeComboBox.Size = [System.Drawing.Size]::new(175, 25)
$typeComboBox.DropDownStyle = 'DropDownList'
[void]$typeComboBox.Items.Add('故障复盘 / 技术教程')
[void]$typeComboBox.Items.Add('学习记录')
[void]$typeComboBox.Items.Add('项目 / 产品决策')
$typeComboBox.SelectedIndex = 0
$form.Controls.Add($typeComboBox)

$slugLabel = [System.Windows.Forms.Label]::new()
$slugLabel.Location = [System.Drawing.Point]::new(300, 100)
$slugLabel.Size = [System.Drawing.Size]::new(90, 25)
$slugLabel.Text = '自定义 slug'
$form.Controls.Add($slugLabel)

$slugTextBox = [System.Windows.Forms.TextBox]::new()
$slugTextBox.Location = [System.Drawing.Point]::new(390, 97)
$slugTextBox.Size = [System.Drawing.Size]::new(280, 25)
$form.Controls.Add($slugTextBox)

$slugHint = [System.Windows.Forms.Label]::new()
$slugHint.Location = [System.Drawing.Point]::new(680, 100)
$slugHint.Size = [System.Drawing.Size]::new(100, 25)
$slugHint.Text = '可留空自动生成'
$slugHint.ForeColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($slugHint)

$descriptionLabel = [System.Windows.Forms.Label]::new()
$descriptionLabel.Location = [System.Drawing.Point]::new(20, 140)
$descriptionLabel.Size = [System.Drawing.Size]::new(110, 25)
$descriptionLabel.Text = '一句话摘要（自动）'
$form.Controls.Add($descriptionLabel)

$descriptionTextBox = [System.Windows.Forms.TextBox]::new()
$descriptionTextBox.Location = [System.Drawing.Point]::new(135, 137)
$descriptionTextBox.Size = [System.Drawing.Size]::new(645, 25)
$form.Controls.Add($descriptionTextBox)

$tagsLabel = [System.Windows.Forms.Label]::new()
$tagsLabel.Location = [System.Drawing.Point]::new(20, 180)
$tagsLabel.Size = [System.Drawing.Size]::new(110, 25)
$tagsLabel.Text = '标签（自动）'
$form.Controls.Add($tagsLabel)

$tagsTextBox = [System.Windows.Forms.TextBox]::new()
$tagsTextBox.Location = [System.Drawing.Point]::new(135, 177)
$tagsTextBox.Size = [System.Drawing.Size]::new(415, 25)
$form.Controls.Add($tagsTextBox)

$suggestButton = [System.Windows.Forms.Button]::new()
$suggestButton.Location = [System.Drawing.Point]::new(560, 175)
$suggestButton.Size = [System.Drawing.Size]::new(110, 29)
$suggestButton.Text = '重新生成推荐'
$form.Controls.Add($suggestButton)

$tagsHint = [System.Windows.Forms.Label]::new()
$tagsHint.Location = [System.Drawing.Point]::new(680, 180)
$tagsHint.Size = [System.Drawing.Size]::new(100, 25)
$tagsHint.Text = '可修改，逗号分隔'
$tagsHint.ForeColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($tagsHint)

$currentLabel = [System.Windows.Forms.Label]::new()
$firstUseHint = [System.Windows.Forms.Label]::new()
$firstUseHint.Location = [System.Drawing.Point]::new(20, 213)
$firstUseHint.Size = [System.Drawing.Size]::new(760, 25)
$firstUseHint.Text = '提示：摘要和标签留空也可以，导入时仍会自动补全；推荐结果只是建议，你可以直接修改。'
$firstUseHint.ForeColor = [System.Drawing.Color]::RoyalBlue
$form.Controls.Add($firstUseHint)

$currentLabel.Location = [System.Drawing.Point]::new(20, 243)
$currentLabel.Size = [System.Drawing.Size]::new(760, 25)
$currentLabel.Text = '当前文章：尚未导入或打开草稿'
$form.Controls.Add($currentLabel)

$importButton = [System.Windows.Forms.Button]::new()
$importButton.Location = [System.Drawing.Point]::new(20, 278)
$importButton.Size = [System.Drawing.Size]::new(175, 42)
$importButton.Text = '1. 导入为草稿'
$form.Controls.Add($importButton)

$checkButton = [System.Windows.Forms.Button]::new()
$checkButton.Location = [System.Drawing.Point]::new(215, 278)
$checkButton.Size = [System.Drawing.Size]::new(175, 42)
$checkButton.Text = '2. 检查草稿'
$checkButton.Enabled = $false
$form.Controls.Add($checkButton)

$previewButton = [System.Windows.Forms.Button]::new()
$previewButton.Location = [System.Drawing.Point]::new(410, 278)
$previewButton.Size = [System.Drawing.Size]::new(175, 42)
$previewButton.Text = '3. 浏览器预览'
$previewButton.Enabled = $false
$form.Controls.Add($previewButton)

$publishButton = [System.Windows.Forms.Button]::new()
$publishButton.Location = [System.Drawing.Point]::new(605, 278)
$publishButton.Size = [System.Drawing.Size]::new(175, 42)
$publishButton.Text = '4. 正式上线'
$publishButton.Enabled = $false
$form.Controls.Add($publishButton)

$openDraftButton = [System.Windows.Forms.Button]::new()
$openDraftButton.Location = [System.Drawing.Point]::new(20, 333)
$openDraftButton.Size = [System.Drawing.Size]::new(175, 32)
$openDraftButton.Text = '编辑正文并插图'
$openDraftButton.Enabled = $false
$form.Controls.Add($openDraftButton)

$existingDraftButton = [System.Windows.Forms.Button]::new()
$existingDraftButton.Location = [System.Drawing.Point]::new(215, 333)
$existingDraftButton.Size = [System.Drawing.Size]::new(175, 32)
$existingDraftButton.Text = '继续已有草稿…'
$form.Controls.Add($existingDraftButton)

$openFolderButton = [System.Windows.Forms.Button]::new()
$openFolderButton.Location = [System.Drawing.Point]::new(410, 333)
$openFolderButton.Size = [System.Drawing.Size]::new(175, 32)
$openFolderButton.Text = '打开文章目录'
$form.Controls.Add($openFolderButton)

$statusLabel = [System.Windows.Forms.Label]::new()
$statusLabel.Location = [System.Drawing.Point]::new(20, 383)
$statusLabel.Size = [System.Drawing.Size]::new(760, 25)
$statusLabel.Text = '状态：等待操作'
$form.Controls.Add($statusLabel)

$logTextBox = [System.Windows.Forms.TextBox]::new()
$logTextBox.Location = [System.Drawing.Point]::new(20, 413)
$logTextBox.Size = [System.Drawing.Size]::new(760, 305)
$logTextBox.Multiline = $true
$logTextBox.ScrollBars = 'Vertical'
$logTextBox.ReadOnly = $true
$logTextBox.Font = [System.Drawing.Font]::new('Consolas', 9)
$form.Controls.Add($logTextBox)

function Write-AppLog {
    param([string]$Message)
    if (-not $Message) { return }
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $logTextBox.AppendText("[$timestamp] $Message`r`n")
    $logTextBox.SelectionStart = $logTextBox.TextLength
    $logTextBox.ScrollToCaret()
}

function Set-AppBusy {
    param([bool]$Busy, [string]$Status)
    $importButton.Enabled = -not $Busy
    $suggestButton.Enabled = -not $Busy
    $existingDraftButton.Enabled = -not $Busy
    $checkButton.Enabled = (-not $Busy) -and [bool]$script:CurrentSlug
    $previewButton.Enabled = (-not $Busy) -and [bool]$script:CurrentSlug
    $publishButton.Enabled = (-not $Busy) -and [bool]$script:CurrentSlug
    $openDraftButton.Enabled = (-not $Busy) -and [bool]$script:CurrentFile
    $statusLabel.Text = "状态：$Status"
    [System.Windows.Forms.Application]::DoEvents()
}

function Set-CurrentArticle {
    param([string]$Slug, [string]$FilePath)
    $script:CurrentSlug = $Slug
    $script:CurrentFile = $FilePath
    $currentLabel.Text = "当前文章：$Slug"
    $checkButton.Enabled = $true
    $previewButton.Enabled = $true
    $publishButton.Enabled = $true
    $openDraftButton.Enabled = $true
    $openDraftButton.Text = '编辑正文并插图'
}

function Get-SelectedArticleType {
    switch ($typeComboBox.SelectedIndex) {
        1 { return 'learning' }
        2 { return 'project' }
        default { return 'troubleshooting' }
    }
}

function Set-SelectedArticleType {
    param([string]$Type)
    switch ($Type) {
        'learning' { $typeComboBox.SelectedIndex = 1 }
        'project' { $typeComboBox.SelectedIndex = 2 }
        default { $typeComboBox.SelectedIndex = 0 }
    }
}

function Update-MetadataSuggestions {
    param(
        [Parameter(Mandatory)][string]$Source,
        [switch]$UseSelectedType
    )
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { return }
    $statusLabel.Text = '状态：正在阅读原稿并生成推荐…'
    [System.Windows.Forms.Application]::DoEvents()
    $arguments = @('suggest', $Source, '--json')
    if ($UseSelectedType) { $arguments += @('--type', (Get-SelectedArticleType)) }
    $result = Invoke-NodeTool $ArticleTool $arguments
    if ($result.ExitCode -ne 0 -or -not $result.Data.ok) {
        $statusLabel.Text = '状态：推荐生成失败，仍可直接导入，工具会自动补全'
        Write-AppLog $result.Output
        return
    }
    if (-not $UseSelectedType) { Set-SelectedArticleType $result.Data.type }
    $descriptionTextBox.Text = $result.Data.description
    $tagsTextBox.Text = @($result.Data.tags) -join '，'
    $statusLabel.Text = '状态：已生成推荐摘要和标签，可以直接修改或导入'
    Write-AppLog "已根据原稿生成推荐：$($result.Data.tags -join '、')"
}

function ConvertTo-CreatorIssueText {
    param($Issues)
    $lines = @()
    foreach ($issue in @($Issues)) {
        $location = if ($issue.line) { "（正文第 $($issue.line) 行）" } else { '' }
        $lines += "• $($issue.message)$location"
        if ($issue.suggestion) { $lines += "  建议：$($issue.suggestion)" }
    }
    return $lines -join "`r`n"
}

$browseButton.Add_Click({
    $dialog = [System.Windows.Forms.OpenFileDialog]::new()
    $dialog.Filter = 'Markdown 文件 (*.md)|*.md'
    $dialog.Title = '选择文章原稿'
    if ($dialog.ShowDialog() -eq 'OK') {
        $sourceTextBox.Text = $dialog.FileName
        Update-MetadataSuggestions $dialog.FileName
    }
})

$suggestButton.Add_Click({
    $source = $sourceTextBox.Text.Trim()
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        [void][System.Windows.Forms.MessageBox]::Show('请先选择 Markdown 原稿。', '生成推荐', 'OK', 'Information')
        return
    }
    Update-MetadataSuggestions $source -UseSelectedType
})

$existingDraftButton.Add_Click({
    if (-not (Test-Path -LiteralPath $DraftsDirectory)) {
        [void][System.Windows.Forms.MessageBox]::Show('目前没有草稿目录。', '文章发布工具', 'OK', 'Information')
        return
    }
    $dialog = [System.Windows.Forms.OpenFileDialog]::new()
    $dialog.InitialDirectory = $DraftsDirectory
    $dialog.Filter = 'Markdown 草稿 (*.md)|*.md'
    $dialog.Title = '继续已有草稿'
    if ($dialog.ShowDialog() -ne 'OK') { return }
    $selected = [System.IO.Path]::GetFullPath($dialog.FileName)
    $draftRoot = [System.IO.Path]::GetFullPath($DraftsDirectory) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $selected.StartsWith($draftRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        [void][System.Windows.Forms.MessageBox]::Show('只能从 content\drafts 打开草稿。', '文章发布工具', 'OK', 'Warning')
        return
    }
    Set-CurrentArticle ([System.IO.Path]::GetFileNameWithoutExtension($selected)) $selected
    Update-MetadataSuggestions $selected
    Write-AppLog "已打开草稿：$selected"
})

$importButton.Add_Click({
    $source = $sourceTextBox.Text.Trim()
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        [void][System.Windows.Forms.MessageBox]::Show('请先选择有效的 Markdown 原稿。', '文章发布工具', 'OK', 'Warning')
        return
    }
    Set-AppBusy $true '正在导入草稿…'
    try {
        $arguments = @('prepare', $source, '--type', (Get-SelectedArticleType), '--json')
        $slug = $slugTextBox.Text.Trim()
        if ($slug) { $arguments += @('--slug', $slug) }
        $description = $descriptionTextBox.Text.Trim()
        if ($description) { $arguments += @('--description', $description) }
        $tags = $tagsTextBox.Text.Trim()
        if ($tags) { $arguments += @('--tags', $tags) }
        $result = Invoke-NodeTool $ArticleTool $arguments
        Write-AppLog $result.Output
        if ($result.ExitCode -ne 0 -or -not $result.Data.ok) {
            $errorMessage = if ($result.Data -and $result.Data.error) { $result.Data.error } else { '导入失败，请查看日志。' }
            throw $errorMessage
        }
        Set-CurrentArticle $result.Data.slug $result.Data.draftPath
        $descriptionTextBox.Text = $result.Data.description
        $tagsTextBox.Text = @($result.Data.tags) -join '，'
        Set-AppBusy $false '草稿导入成功；摘要和标签已补全，可以直接检查'
    } catch {
        Set-AppBusy $false '导入失败'
        [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '导入失败', 'OK', 'Error')
    }
})

$checkButton.Add_Click({
    Set-AppBusy $true '正在检查文章…'
    try {
        $result = Invoke-NodeTool $ArticleTool @('check', $script:CurrentSlug, '--fix', '--json')
        Write-AppLog $result.Output
        if ($result.ExitCode -ne 0 -or -not $result.Data.ok) {
            $messages = ConvertTo-CreatorIssueText $result.Data.issues
            throw $(if ($messages) { $messages } else { '文章检查未通过，请查看日志。' })
        }
        foreach ($fix in @($result.Data.fixes)) { Write-AppLog $fix }
        Set-AppBusy $false '检查通过，可以预览或发布'
        $fixedMessage = if (@($result.Data.fixes).Count -gt 0) {
            "文章检查通过。`r`n`r`n工具还自动处理了：`r`n$(@($result.Data.fixes) -join "`r`n")"
        } else { '文章检查通过。' }
        [void][System.Windows.Forms.MessageBox]::Show($fixedMessage, '检查完成', 'OK', 'Information')
    } catch {
        Set-AppBusy $false '检查未通过'
        $choice = [System.Windows.Forms.MessageBox]::Show(
            "$($_.Exception.Message)`r`n`r`n是否立即打开文章编辑器修改？",
            '检查发现需要处理的内容',
            'YesNo',
            'Warning'
        )
        if ($choice -eq 'Yes' -and $script:CurrentFile) { Show-ArticleEditor }
    }
})

$previewButton.Add_Click({
    Stop-ArticlePreview
    try {
        Stage-DraftAssetsForPreview $script:CurrentSlug
        $port = Get-FreeTcpPort
        $arguments = @($TsxCli, $ArticlePreview, $script:CurrentSlug, '--', '-p', "$port")
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $NodeCommand
        $startInfo.Arguments = ($arguments | ForEach-Object { ConvertTo-CommandLineArgument $_ }) -join ' '
        $startInfo.WorkingDirectory = $ProjectRoot
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $script:PreviewProcess = [System.Diagnostics.Process]::Start($startInfo)
        Set-AppBusy $true '正在启动草稿预览…'
        $ready = $false
        for ($attempt = 0; $attempt -lt 100; $attempt += 1) {
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 150
            if (Test-TcpPort $port) { $ready = $true; break }
            if ($script:PreviewProcess.HasExited) { break }
        }
        Set-AppBusy $false $(if ($ready) { '草稿预览已打开' } else { '草稿预览启动失败' })
        if ($ready) {
            $url = "http://127.0.0.1:$port/articles/$($script:CurrentSlug)"
            Write-AppLog "草稿预览：$url"
            Start-Process $url
        } else {
            Stop-ArticlePreview
            [void][System.Windows.Forms.MessageBox]::Show('预览服务没有成功启动，请查看文章检查结果。', '预览失败', 'OK', 'Error')
        }
    } catch {
        Stop-ArticlePreview
        Set-AppBusy $false '草稿预览启动失败'
        [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '预览失败', 'OK', 'Error')
    }
})

$publishButton.Add_Click({
    $confirmation = [System.Windows.Forms.MessageBox]::Show(
        "正式上线后，互联网上的访客将能看到这篇文章和它的图片。`r`n`r`n工具将执行最终检查、只提交当前文章及其图片、推送 GitHub，并等待 Vercel 完成生产部署。`r`n`r`n确认现在公开吗？",
        '确认正式上线',
        'YesNo',
        'Question'
    )
    if ($confirmation -ne 'Yes') { return }
    Stop-ArticlePreview
    Set-AppBusy $true '正在执行最终检查并上线，通常需要 1～3 分钟…'
    try {
        $result = Invoke-NodeTool $ArticleTool @('online', $script:CurrentSlug, '--json')
        Write-AppLog $result.Output
        if ($result.ExitCode -ne 0 -or -not $result.Data.ok) {
            $errorMessage = if ($result.Data -and $result.Data.error) { $result.Data.error } else { '上线失败，请查看日志。' }
            throw $errorMessage
        }
        $script:CurrentFile = $result.Data.articlePath
        $openDraftButton.Enabled = $true
        $openDraftButton.Text = '打开已发布 Markdown'
        $checkButton.Enabled = $false
        $previewButton.Enabled = $false
        $publishButton.Enabled = $false
        $statusLabel.Text = if ($result.Data.deploymentVerified) {
            '状态：正式上线成功，访客已经可以访问'
        } else {
            '状态：已推送 GitHub，Vercel 仍在完成部署'
        }
        $articleName = [System.IO.Path]::GetFileName($result.Data.articlePath)
        $onlineState = if ($result.Data.deploymentVerified) { 'Vercel 生产部署已完成，访客现在可以看到。' } else { '文章已推送，Vercel 仍在部署，稍后即可访问。' }
        $openOnline = [System.Windows.Forms.MessageBox]::Show(
            "正式上线完成！`r`n`r`n文章：$articleName`r`n$onlineState`r`n`r`n是否现在打开线上文章？",
            '文章已正式上线',
            'YesNo',
            'Information'
        )
        if ($openOnline -eq 'Yes') { Start-Process $result.Data.url }
    } catch {
        Set-AppBusy $false '上线失败，文章仍安全保留在本机'
        [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '上线失败', 'OK', 'Error')
    }
})

$openDraftButton.Add_Click({
    Show-ArticleEditor
})

$openFolderButton.Add_Click({ Start-Process explorer.exe $ArticlesDirectory })
$form.Add_FormClosing({ Stop-ArticlePreview })

Write-AppLog '工具已启动。第一次使用只需选择原稿，摘要、标签和类型会自动推荐。'
[void]$form.ShowDialog()
