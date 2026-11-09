Option Explicit
Dim shell, fso, folder, nodeExe, candidates, candidate
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
candidates = Array(shell.ExpandEnvironmentStrings("%SUICHU_NODE%"), shell.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe"), shell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe"), shell.ExpandEnvironmentStrings("%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"))
nodeExe = ""
For Each candidate In candidates
    If fso.FileExists(candidate) Then
        nodeExe = candidate
        Exit For
    End If
Next
If nodeExe = "" Then
    MsgBox "Please install Node.js 22+ or set SUICHU_NODE to node.exe.", 16, "Suichu"
    WScript.Quit 1
End If
shell.CurrentDirectory = folder
shell.Run Chr(34) & nodeExe & Chr(34) & " " & Chr(34) & folder & "\launch.cjs" & Chr(34), 0, False
