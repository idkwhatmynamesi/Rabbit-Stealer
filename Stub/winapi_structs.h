#pragma once
#ifndef CALLSTACK_SYSCALL
#define CALLSTACK_SYSCALL

#include <Windows.h>
#include <TlHelp32.h>
#include <string>

namespace HiddenCalls {
    HANDLE CreateToolhelp32Snapshot(DWORD dwFlags, DWORD th32ProcessID);
    BOOL Process32First(const HANDLE& hSnapshot, LPPROCESSENTRY32 lppe);
    BOOL Process32Next(HANDLE hSnapshot, LPPROCESSENTRY32 lppe);
    BOOL CloseHandle(HANDLE hObject);
    BOOL GetExitCodeProcess(HANDLE hProcess, LPDWORD lpExitCode);
    BOOL TerminateProcess(HANDLE hProcess, UINT uExitCode);
    HANDLE OpenProcess(DWORD dwDesiredAccess, BOOL bInheritHandle, DWORD dwProcessId);

    // Workarounds
    FARPROC CustomGetProcAddress(HMODULE hModule, LPCSTR lpProcName);
    wchar_t* extractor(LPCWSTR str1);
    HMODULE CustomGetModuleHandleW(LPCWSTR dllName);
    HMODULE CustomLoadLibraryExA(LPCSTR lpLibFileName, DWORD dwFlags);


    HANDLE CreateFileA(LPCSTR lpFileName, DWORD dwDesiredAccess, DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes, DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes, HANDLE hTemplateFile);
    DWORD GetFileSize(HANDLE hFile, LPDWORD lpFileSizeHigh);
    HANDLE CreateFileMappingA(HANDLE hFile, LPSECURITY_ATTRIBUTES lpFileMappingAttributes, DWORD flProtect, DWORD dwMaximumSizeHigh, DWORD dwMaximumSizeLow, LPCSTR lpName);
    LPVOID MapViewOfFile(HANDLE hFileMappingObject, DWORD dwDesiredAccess, DWORD dwFileOffsetHigh, DWORD dwFileOffsetLow, SIZE_T dwNumberOfBytesToMap);
    BOOL UnmapViewOfFile(LPCVOID lpBaseAddress);

    BOOL ReadFile(HANDLE hFile, LPVOID lpBuffer, DWORD nNumberOfBytesToRead, LPDWORD lpNumberOfBytesRead, LPOVERLAPPED lpOverlapped);
    BOOL WriteFile(HANDLE hFile, LPCVOID lpBuffer, DWORD nNumberOfBytesToWrite, LPDWORD lpNumberOfBytesWritten, LPOVERLAPPED lpOverlapped);
    BOOL DeleteFileA(LPCSTR lpFileName);
    BOOL CreateDirectoryA(LPCSTR lpPathName, LPSECURITY_ATTRIBUTES lpSecurityAttributes);
    BOOL CopyFileA(LPCSTR lpExistingFileName, LPCSTR lpNewFileName, BOOL bFailIfExists);
    BOOL CopyDirectory(const std::string& srcDir, const std::string& destDir);
    UINT GetTempPathA(UINT nBufferLength, LPSTR lpBuffer);


    //

    HANDLE OpenProcess(DWORD dwDesiredAccess, BOOL bInheritHandle, DWORD dwProcessId);
    BOOL CreateProcessW(LPCWSTR lpApplicationName, LPWSTR lpCommandLine, LPSECURITY_ATTRIBUTES lpProcessAttributes, LPSECURITY_ATTRIBUTES lpThreadAttributes, BOOL bInheritHandles, DWORD dwCreationFlags, LPVOID lpEnvironment, LPCWSTR lpCurrentDirectory, LPSTARTUPINFOW lpStartupInfo, LPPROCESS_INFORMATION lpProcessInformation);
    BOOL ReadProcessMemory(HANDLE hProcess, LPCVOID lpBaseAddress, LPVOID lpBuffer, SIZE_T nSize, SIZE_T* lpNumberOfBytesRead);
    BOOL VirtualQueryEx(HANDLE hProcess, LPCVOID lpAddress, PMEMORY_BASIC_INFORMATION lpBuffer, SIZE_T dwLength);
}
#endif