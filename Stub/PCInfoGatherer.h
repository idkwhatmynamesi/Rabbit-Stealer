#pragma once

#include <string>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <windows.h>
#include <intrin.h>
#include <winreg.h>
#include <comdef.h>
#include <Wbemidl.h>

#pragma comment(lib, "wbemuuid.lib")

namespace ghostnet {

class PCInfoGatherer {
private:
    std::ofstream outputFile;

    void writeSection(const std::string& title) {
        outputFile << "\n" << std::string(60, '=') << "\n";
        outputFile << "  " << title << "\n";
        outputFile << std::string(60, '=') << "\n";
    }

    std::string getCurrentDateTime() {
        auto now = std::time(nullptr);
        auto tm = *std::localtime(&now);
        std::ostringstream oss;
        oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
        return oss.str();
    }

    void getSystemInfo() {
        writeSection("SYSTEM INFORMATION");

        SYSTEM_INFO sysInfo;
        GetSystemInfo(&sysInfo);

        char computerName[MAX_COMPUTERNAME_LENGTH + 1];
        DWORD size = sizeof(computerName);
        if (GetComputerNameA(computerName, &size)) {
            outputFile << "Computer Name: " << computerName << "\n";
        }

        char username[UNLEN + 1];
        size = sizeof(username);
        if (GetUserNameA(username, &size)) {
            outputFile << "Current User: " << username << "\n";
        }

        char sysDir[MAX_PATH];
        if (GetSystemDirectoryA(sysDir, MAX_PATH)) {
            outputFile << "System Directory: " << sysDir << "\n";
        }

        char winDir[MAX_PATH];
        if (GetWindowsDirectoryA(winDir, MAX_PATH)) {
            outputFile << "Windows Directory: " << winDir << "\n";
        }

        outputFile << "Processor Architecture: ";
        switch (sysInfo.wProcessorArchitecture) {
        case PROCESSOR_ARCHITECTURE_AMD64: outputFile << "x64 (AMD64)\n"; break;
        case PROCESSOR_ARCHITECTURE_INTEL: outputFile << "x86 (Intel)\n"; break;
        case PROCESSOR_ARCHITECTURE_ARM: outputFile << "ARM\n"; break;
        case PROCESSOR_ARCHITECTURE_ARM64: outputFile << "ARM64\n"; break;
        default: outputFile << "Unknown\n"; break;
        }

        outputFile << "Number of Processors: " << sysInfo.dwNumberOfProcessors << "\n";
        outputFile << "Page Size: " << sysInfo.dwPageSize << " bytes\n";
    }

    void getWindowsVersion() {
        HRESULT hres;
        hres = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (FAILED(hres)) {
            return;
        }

        hres = CoInitializeSecurity(NULL, -1, NULL, NULL, RPC_C_AUTHN_LEVEL_DEFAULT,
            RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE, NULL);

        IWbemLocator* pLoc = NULL;
        hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
            IID_IWbemLocator, (LPVOID*)&pLoc);

        if (FAILED(hres)) {
            CoUninitialize();
            return;
        }

        IWbemServices* pSvc = NULL;
        hres = pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0, NULL, 0, 0, &pSvc);

        if (FAILED(hres)) {
            pLoc->Release();
            CoUninitialize();
            return;
        }

        hres = CoSetProxyBlanket(pSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, NULL,
            RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);

        IEnumWbemClassObject* pEnumerator = NULL;
        hres = pSvc->ExecQuery(bstr_t("WQL"),
            bstr_t("SELECT Caption, Version, OSArchitecture FROM Win32_OperatingSystem"),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY, NULL, &pEnumerator);

        if (SUCCEEDED(hres)) {
            IWbemClassObject* pclsObj = NULL;
            ULONG uReturn = 0;

            while (pEnumerator) {
                HRESULT hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);
                if (0 == uReturn) break;

                VARIANT vtProp;

                hr = pclsObj->Get(L"Caption", 0, &vtProp, 0, 0);
                if (SUCCEEDED(hr)) {
                    outputFile << "Windows Version: " << _com_util::ConvertBSTRToString(vtProp.bstrVal) << "\n";
                    VariantClear(&vtProp);
                }

                hr = pclsObj->Get(L"Version", 0, &vtProp, 0, 0);
                if (SUCCEEDED(hr)) {
                    outputFile << "Build Version: " << _com_util::ConvertBSTRToString(vtProp.bstrVal) << "\n";
                    VariantClear(&vtProp);
                }

                hr = pclsObj->Get(L"OSArchitecture", 0, &vtProp, 0, 0);
                if (SUCCEEDED(hr)) {
                    outputFile << "Architecture: " << _com_util::ConvertBSTRToString(vtProp.bstrVal) << "\n";
                    VariantClear(&vtProp);
                }

                pclsObj->Release();
            }
        }
    }

    void getCPUInfo() {
        writeSection("CPU INFORMATION");

        int cpuInfo[4] = { 0 };
        __cpuid(cpuInfo, 0);

        char vendor[13];
        memcpy(vendor, &cpuInfo[1], 4);
        memcpy(vendor + 4, &cpuInfo[3], 4);
        memcpy(vendor + 8, &cpuInfo[2], 4);
        vendor[12] = '\0';
        outputFile << "CPU Vendor: " << vendor << "\n";

        __cpuid(cpuInfo, 1);
        outputFile << "CPU Family: " << ((cpuInfo[0] >> 8) & 0xF) << "\n";
        outputFile << "CPU Model: " << ((cpuInfo[0] >> 4) & 0xF) << "\n";
        outputFile << "CPU Stepping: " << (cpuInfo[0] & 0xF) << "\n";

        HKEY hKey;
        if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
            char processorName[256];
            DWORD size = sizeof(processorName);
            if (RegQueryValueExA(hKey, "ProcessorNameString", NULL, NULL, (LPBYTE)processorName, &size) == ERROR_SUCCESS) {
                outputFile << "CPU Name: " << processorName << "\n";
            }

            DWORD mhz;
            size = sizeof(DWORD);
            if (RegQueryValueExA(hKey, "~MHz", NULL, NULL, (LPBYTE)&mhz, &size) == ERROR_SUCCESS) {
                outputFile << "CPU Speed: " << mhz << " MHz\n";
            }

            RegCloseKey(hKey);
        }
    }

    void getMemoryInfo() {
        writeSection("MEMORY INFORMATION");

        MEMORYSTATUSEX memInfo;
        memInfo.dwLength = sizeof(MEMORYSTATUSEX);
        if (GlobalMemoryStatusEx(&memInfo)) {
            outputFile << "Total Physical Memory: " << (memInfo.ullTotalPhys / (1024 * 1024)) << " MB\n";
            outputFile << "Available Physical Memory: " << (memInfo.ullAvailPhys / (1024 * 1024)) << " MB\n";
            outputFile << "Memory Usage: " << memInfo.dwMemoryLoad << "%\n";
            outputFile << "Total Virtual Memory: " << (memInfo.ullTotalVirtual / (1024 * 1024)) << " MB\n";
            outputFile << "Available Virtual Memory: " << (memInfo.ullAvailVirtual / (1024 * 1024)) << " MB\n";
            outputFile << "Total Page File: " << (memInfo.ullTotalPageFile / (1024 * 1024)) << " MB\n";
            outputFile << "Available Page File: " << (memInfo.ullAvailPageFile / (1024 * 1024)) << " MB\n";
        }
    }

    void getDiskInfo() {
        writeSection("DISK INFORMATION");

        DWORD drives = GetLogicalDrives();
        for (int i = 0; i < 26; i++) {
            if (drives & (1 << i)) {
                char driveLetter = 'A' + i;
                std::string drivePath = std::string(1, driveLetter) + ":\\";

                UINT driveType = GetDriveTypeA(drivePath.c_str());
                outputFile << "\nDrive " << driveLetter << ":\n";

                switch (driveType) {
                case DRIVE_FIXED: outputFile << "  Type: Fixed Drive\n"; break;
                case DRIVE_REMOVABLE: outputFile << "  Type: Removable Drive\n"; break;
                case DRIVE_REMOTE: outputFile << "  Type: Network Drive\n"; break;
                case DRIVE_CDROM: outputFile << "  Type: CD-ROM Drive\n"; break;
                case DRIVE_RAMDISK: outputFile << "  Type: RAM Drive\n"; break;
                default: outputFile << "  Type: Unknown\n"; break;
                }

                ULARGE_INTEGER freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes;
                if (GetDiskFreeSpaceExA(drivePath.c_str(), &freeBytesAvailable, &totalNumberOfBytes, &totalNumberOfFreeBytes)) {
                    outputFile << "  Total Size: " << (totalNumberOfBytes.QuadPart / (1024 * 1024 * 1024)) << " GB\n";
                    outputFile << "  Free Space: " << (totalNumberOfFreeBytes.QuadPart / (1024 * 1024 * 1024)) << " GB\n";
                }

                char volumeName[MAX_PATH + 1];
                char fileSystemName[MAX_PATH + 1];
                DWORD serialNumber, maxComponentLen, fileSystemFlags;

                if (GetVolumeInformationA(drivePath.c_str(), volumeName, sizeof(volumeName),
                    &serialNumber, &maxComponentLen, &fileSystemFlags,
                    fileSystemName, sizeof(fileSystemName))) {
                    if (strlen(volumeName) > 0) {
                        outputFile << "  Volume Name: " << volumeName << "\n";
                    }
                    outputFile << "  File System: " << fileSystemName << "\n";
                    outputFile << "  Serial Number: " << std::hex << serialNumber << std::dec << "\n";
                }
            }
        }
    }

    void getBasicNetworkInfo() {
        writeSection("BASIC NETWORK INFORMATION");

        char computerName[MAX_COMPUTERNAME_LENGTH + 1];
        DWORD size = sizeof(computerName);
        if (GetComputerNameA(computerName, &size)) {
            outputFile << "Computer Network Name: " << computerName << "\n";
        }

        HKEY hKey;
        if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
            char domain[256];
            DWORD domainSize = sizeof(domain);
            if (RegQueryValueExA(hKey, "Domain", NULL, NULL, (LPBYTE)domain, &domainSize) == ERROR_SUCCESS) {
                outputFile << "Domain: " << domain << "\n";
            }

            char hostname[256];
            DWORD hostnameSize = sizeof(hostname);
            if (RegQueryValueExA(hKey, "Hostname", NULL, NULL, (LPBYTE)hostname, &hostnameSize) == ERROR_SUCCESS) {
                outputFile << "Hostname: " << hostname << "\n";
            }

            RegCloseKey(hKey);
        }

        outputFile << "Note: Network adapter details excluded (no socket dependencies)\n";
    }

    void getInstalledSoftware() {
        writeSection("INSTALLED SOFTWARE (Sample)");

        HKEY hKey;
        const char* subkey = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall";

        if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, subkey, 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
            DWORD index = 0;
            char keyName[256];
            DWORD keyNameSize = sizeof(keyName);
            int count = 0;

            outputFile << "Showing first 20 installed programs:\n\n";

            while (RegEnumKeyExA(hKey, index, keyName, &keyNameSize, NULL, NULL, NULL, NULL) == ERROR_SUCCESS && count < 20) {
                HKEY subKey;
                if (RegOpenKeyExA(hKey, keyName, 0, KEY_READ, &subKey) == ERROR_SUCCESS) {
                    char displayName[512];
                    DWORD size = sizeof(displayName);

                    if (RegQueryValueExA(subKey, "DisplayName", NULL, NULL, (LPBYTE)displayName, &size) == ERROR_SUCCESS) {
                        outputFile << "  " << displayName;

                        char version[256];
                        size = sizeof(version);
                        if (RegQueryValueExA(subKey, "DisplayVersion", NULL, NULL, (LPBYTE)version, &size) == ERROR_SUCCESS) {
                            outputFile << " (Version: " << version << ")";
                        }
                        outputFile << "\n";
                        count++;
                    }
                    RegCloseKey(subKey);
                }

                index++;
                keyNameSize = sizeof(keyName);
            }

            RegCloseKey(hKey);
        }
    }

    void getRunningProcesses() {
        writeSection("RUNNING PROCESSES (Sample)");

        HANDLE hProcessSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hProcessSnap == INVALID_HANDLE_VALUE) {
            return;
        }

        PROCESSENTRY32 pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32);

        if (Process32First(hProcessSnap, &pe32)) {
            outputFile << "Showing first 30 running processes:\n\n";
            int count = 0;

            do {
                if (count >= 30) break;

                outputFile << "  PID: " << std::setw(8) << pe32.th32ProcessID
                    << " | " << pe32.szExeFile << "\n";
                count++;
            } while (Process32Next(hProcessSnap, &pe32));
        }

        CloseHandle(hProcessSnap);
    }

    void getEnvironmentVariables() {
        writeSection("ENVIRONMENT VARIABLES");

        const char* commonVars[] = {
            "PATH", "USERPROFILE", "USERNAME", "COMPUTERNAME", "OS",
            "PROCESSOR_ARCHITECTURE", "PROCESSOR_IDENTIFIER", "NUMBER_OF_PROCESSORS",
            "APPDATA", "LOCALAPPDATA", "PROGRAMFILES", "PROGRAMFILES(X86)",
            "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "TEMP", "TMP", "HOMEDRIVE", "HOMEPATH"
        };

        for (const char* varName : commonVars) {
            char* value = nullptr;
            size_t len = 0;
            errno_t err = _dupenv_s(&value, &len, varName);

            if (err == 0 && value != nullptr) {
                outputFile << "  " << varName << "=" << value << "\n";
                free(value);
            }
        }

        char buffer[32767];
        DWORD result;

        const char* additionalVars[] = {
            "PROCESSOR_LEVEL", "PROCESSOR_REVISION", "COMSPEC", "PATHEXT"
        };

        for (const char* varName : additionalVars) {
            result = GetEnvironmentVariableA(varName, buffer, sizeof(buffer));
            if (result > 0 && result < sizeof(buffer)) {
                outputFile << "  " << varName << "=" << buffer << "\n";
            }
        }
    }

    void getSystemUptime() {
        writeSection("SYSTEM UPTIME");

        ULONGLONG uptime = GetTickCount64();
        ULONGLONG seconds = uptime / 1000;
        ULONGLONG minutes = seconds / 60;
        ULONGLONG hours = minutes / 60;
        ULONGLONG days = hours / 24;

        outputFile << "System Uptime: " << days << " days, "
            << (hours % 24) << " hours, "
            << (minutes % 60) << " minutes, "
            << (seconds % 60) << " seconds\n";
    }

public:
    bool gatherInformation(const std::string& filename) {
        outputFile.open(filename);
        if (!outputFile.is_open()) {
            return false;
        }

        outputFile << std::string(60, '*') << "\n";
        outputFile << "           COMPLETE PC SYSTEM INFORMATION\n";
        outputFile << "           Generated: " << getCurrentDateTime() << "\n";
        outputFile << std::string(60, '*') << "\n";

        getSystemInfo();
        getWindowsVersion();
        getCPUInfo();
        getMemoryInfo();
        getDiskInfo();
        getBasicNetworkInfo();
        getSystemUptime();
        getInstalledSoftware();
        getRunningProcesses();
        getEnvironmentVariables();

        outputFile << "\n" << std::string(60, '*') << "\n";
        outputFile << "           INFORMATION GATHERING COMPLETE\n";
        outputFile << std::string(60, '*') << "\n";

        outputFile.close();
        CoUninitialize();
        return true;
    }
};

}


