#pragma once
#ifndef ENTRYPOINT_ANTIDEBUG_HPP
#define ENTRYPOINT_ANTIDEBUG_HPP

#include <Windows.h>
#include "NtGlobalFlag.h"
#include "IsDebuggerPresent.h"
#include "Interrupt_3.h"
#include "BeingDebugged.h"
#include "SharedUserData_KernelDebugger.h"
#include "UnhandledExceptionFilter_Handler.h"
#include "Obfusheader.h"

inline void RunAllAntiDebug() {
    if (NtGlobalFlag()) {
        OutputDebugString(OBF(L"detected\n"));
        exit(1);
    }

    if (IsDebuggerPresentAPI()) {
        OutputDebugString(OBF(L"detected\n"));
        exit(1);
    }

    if (Interrupt_3()) {
        OutputDebugString(OBF(L"detected!\n"));
        exit(1);
    }

    if (IsDebuggerPresentPEB()) {
        OutputDebugString(OBF(L"detected!\n"));
        exit(1);
    }

    if (UnhandledExcepFilterTest()) {
        OutputDebugString(OBF(L"detected\n"));
        exit(1);
    }

    if (SharedUserData_KernelDebugger()) {
        OutputDebugString(OBF(L"booring!\n"));
        exit(1);
    }

}

#endif // ENTRYPOINT_ANTIDEBUG_HPP
