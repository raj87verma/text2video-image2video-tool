; =============================================================================
; Local Video Maker - Windows Installer Script (NSIS)
; Installs the offline HTML/CSS/JS app to the user's PC, creates Desktop and
; Start Menu shortcuts that open it in the default browser, and registers a
; standard Windows uninstaller (visible in "Add or Remove Programs").
; No internet, no APIs, no external services, no admin rights required.
; =============================================================================

!include "MUI2.nsh"

Name "Local Video Maker"
OutFile "LocalVideoMaker-Setup.exe"
InstallDir "$LOCALAPPDATA\LocalVideoMaker"
InstallDirRegKey HKCU "Software\LocalVideoMaker" "Install_Dir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

; ----------------------------- UI CONFIG -----------------------------------
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\LocalVideoMaker.vbs"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Local Video Maker now"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ----------------------------- INSTALL SECTION ------------------------------
Section "Local Video Maker (required)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Application files (the offline web app)
  File "app\index.html"
  File "app\app.js"
  File "app\style.css"
  File "app\README.md"

  ; Launcher script: opens index.html in the user's default browser.
  ; Using a .vbs avoids flashing a console window (unlike a .bat/.cmd).
  FileOpen $0 "$INSTDIR\LocalVideoMaker.vbs" w
  FileWrite $0 'Set objShell = CreateObject("WScript.Shell")$\r$\n'
  FileWrite $0 'objShell.Run Chr(34) & "$INSTDIR\index.html" & Chr(34), 1, False$\r$\n'
  FileClose $0

  ; Store installation folder and write uninstaller
  WriteRegStr HKCU "Software\LocalVideoMaker" "Install_Dir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Register in Windows "Add or Remove Programs"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "DisplayName" "Local Video Maker"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "Publisher" "raj87verma"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "DisplayVersion" "1.0.0"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker" "NoRepair" 1

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Local Video Maker"
  CreateShortcut "$SMPROGRAMS\Local Video Maker\Local Video Maker.lnk" "$INSTDIR\LocalVideoMaker.vbs" "" "$INSTDIR\LocalVideoMaker.vbs" 0 SW_SHOWNORMAL "" "Open Local Video Maker"
  CreateShortcut "$SMPROGRAMS\Local Video Maker\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Local Video Maker.lnk" "$INSTDIR\LocalVideoMaker.vbs" "" "$INSTDIR\LocalVideoMaker.vbs" 0 SW_SHOWNORMAL "" "Open Local Video Maker"
SectionEnd

; ----------------------------- UNINSTALL SECTION ----------------------------
Section "Uninstall"
  Delete "$INSTDIR\index.html"
  Delete "$INSTDIR\app.js"
  Delete "$INSTDIR\style.css"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\LocalVideoMaker.vbs"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\Local Video Maker\Local Video Maker.lnk"
  Delete "$SMPROGRAMS\Local Video Maker\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Local Video Maker"
  Delete "$DESKTOP\Local Video Maker.lnk"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LocalVideoMaker"
  DeleteRegKey HKCU "Software\LocalVideoMaker"
SectionEnd
