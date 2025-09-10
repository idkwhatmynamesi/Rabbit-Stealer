#include "Anti_Triage.h"
#include "Obfusheader.h"

bool IsProcessRunning(const wchar_t* processName) {
    HANDLE snap = CALL_EXPORT(L"kernel32.dll", "CreateToolhelp32Snapshot", HANDLE(WINAPI*)(DWORD, DWORD), TH32CS_SNAPPROCESS, 0);
    if (snap == INVALID_HANDLE_VALUE) return false;

    PROCESSENTRY32 pe;
    pe.dwSize = sizeof(pe);

    bool found = false;
    if (CALL_EXPORT(L"kernel32.dll", "Process32FirstW", BOOL(WINAPI*)(HANDLE, LPPROCESSENTRY32), snap, &pe)) {
        do {
            if (_wcsicmp(pe.szExeFile, processName) == 0) {
                found = true;
                break;
            }
        } while (CALL_EXPORT(L"kernel32.dll", "Process32NextW", BOOL(WINAPI*)(HANDLE, LPPROCESSENTRY32), snap, &pe));
    }

    CALL_EXPORT(L"kernel32.dll", "CloseHandle", BOOL(WINAPI*)(HANDLE), snap);
    return found;
}

