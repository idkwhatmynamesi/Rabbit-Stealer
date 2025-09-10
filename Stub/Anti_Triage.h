#pragma once
#include <windows.h>
#include <tlhelp32.h>

bool IsProcessRunning(const wchar_t* processName);
