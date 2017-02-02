$xBimGeometryPackages = Join-Path -Path $env:USERPROFILE -ChildPath "\.nuget\packages\Xbim.Geometry"
$latestxBimGeometryPackage32 = Join-Path -Path ((Get-ChildItem -Path $xBimGeometryPackages | Sort-Object Fullname -Descending)[0].FullName) -ChildPath "build\x86\Xbim.Geometry.Engine32.dll"
$latestxBimGeometryPackage64 = Join-Path -Path ((Get-ChildItem -Path $xBimGeometryPackages | Sort-Object Fullname -Descending)[0].FullName) -ChildPath "build\x64\Xbim.Geometry.Engine64.dll"
if (!(Test-Path "$PSScriptRoot\Dependencies")){
    New-Item -ItemType Directory -Path "$PSScriptRoot\Dependencies"
}
Copy-Item -Path $latestxBimGeometryPackage32 -Destination "$PSScriptRoot\Dependencies\Xbim.Geometry.Engine32.dll"
Copy-Item -Path $latestxBimGeometryPackage64 -Destination "$PSScriptRoot\Dependencies\Xbim.Geometry.Engine64.dll"