$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
py "$root\server.py"
