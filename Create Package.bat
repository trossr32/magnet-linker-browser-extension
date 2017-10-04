SET "sln=C:\Users\Rob\Source\Repos\magnet-linker-chrome-extension\MagnetLinkerChromeExtension.sln"
SET "projDir=C:\Users\Rob\Source\Repos\magnet-linker-chrome-extension\CreatePackage\"
SET "sysDir=C:\windows\system32\"
SET "exeDir=C:\Users\Rob\Documents\executables\MagnetLinkerChromeExtension\"

if not exist "C:\nuget\" mkdir C:\nuget
if not exist C:\nuget\nuget.exe (
	%sysDir%bitsadmin.exe /transfer "Getting nuget.exe..." https://dist.nuget.org/win-x86-commandline/latest/nuget.exe C:\nuget\nuget.exe
)
C:\nuget\nuget.exe update -self
C:\nuget\nuget.exe restore %sln%

"%ProgramFiles(x86)%\Microsoft Visual Studio\2017\Enterprise\MSBuild\15.0\Bin\MSBuild.exe" %projDir%CreatePackage.csproj /t:rebuild /property:Configuration=Release

::%sysDir%timeout /t 1
%sysDir%robocopy %projDir%bin\Release %exeDir% /MIR
::%sysDir%timeout /t 1

%exeDir%CreatePackage.exe