#pragma once
#ifndef ENTRYPOINT_ANTIVM_HPP
#define ENTRYPOINT_ANTIVM_HPP

#include <Windows.h>
#include "Anti_Triage.h"
#include <iostream>

inline void RunAllAntiVM() {
    if (IsProcessRunning(L"sysmon.exe")) {
        OutputDebugStringW(L"really detected?.");
        exit(1);
    }

}

#endif
