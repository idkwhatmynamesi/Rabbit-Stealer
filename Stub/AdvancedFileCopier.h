#pragma once

#include <string>
#include <vector>
#include <windows.h>
#include <filesystem>

namespace ghostnet {

namespace fs = std::filesystem;

class AdvancedFileCopier {
private:
    static constexpr size_t BUFFER_SIZE = 1024 * 1024;

    static bool copyLockedFile(const std::string& source, const std::string& dest) {
        HANDLE hSource = CreateFileA(
            source.c_str(),
            GENERIC_READ,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            nullptr,
            OPEN_EXISTING,
            FILE_FLAG_SEQUENTIAL_SCAN,
            nullptr
        );

        if (hSource == INVALID_HANDLE_VALUE) {
            return false;
        }

        HANDLE hDest = CreateFileA(
            dest.c_str(),
            GENERIC_WRITE,
            0,
            nullptr,
            CREATE_ALWAYS,
            FILE_ATTRIBUTE_NORMAL,
            nullptr
        );

        if (hDest == INVALID_HANDLE_VALUE) {
            CloseHandle(hSource);
            return false;
        }

        LARGE_INTEGER fileSize;
        if (!GetFileSizeEx(hSource, &fileSize)) {
            CloseHandle(hSource);
            CloseHandle(hDest);
            return false;
        }

        bool success = copyFileInChunks(hSource, hDest, fileSize.QuadPart);

        CloseHandle(hSource);
        CloseHandle(hDest);

        return success;
    }

    static bool copyFileInChunks(HANDLE hSource, HANDLE hDest, LONGLONG fileSize) {
        std::vector<BYTE> buffer(BUFFER_SIZE);
        LONGLONG totalCopied = 0;

        while (totalCopied < fileSize) {
            LONGLONG remaining = fileSize - totalCopied;
            DWORD toRead = static_cast<DWORD>((remaining > BUFFER_SIZE) ? BUFFER_SIZE : remaining);
            DWORD bytesRead = 0;
            DWORD bytesWritten = 0;

            if (!ReadFile(hSource, buffer.data(), toRead, &bytesRead, nullptr)) {
                return false;
            }

            if (bytesRead == 0) break;

            if (!WriteFile(hDest, buffer.data(), bytesRead, &bytesWritten, nullptr)) {
                return false;
            }

            if (bytesWritten != bytesRead) {
                return false;
            }

            totalCopied += bytesRead;
        }

        return true;
    }

public:
    static bool copyFileAdvanced(const std::string& source, const std::string& dest) {
        std::wstring wSource = std::wstring(source.begin(), source.end());
        std::wstring wDest = std::wstring(dest.begin(), dest.end());

        if (CopyFileExW(wSource.c_str(), wDest.c_str(), nullptr, nullptr, nullptr,
            COPY_FILE_ALLOW_DECRYPTED_DESTINATION)) {
            return true;
        }

        return copyLockedFile(source, dest);
    }

    static bool copyDirectoryAdvanced(const std::string& source, const std::string& destination) {
        try {
            if (!fs::exists(source)) {
                return false;
            }

            fs::create_directories(destination);

            bool allSuccess = true;

            for (const auto& entry : fs::recursive_directory_iterator(source, fs::directory_options::skip_permission_denied)) {
                try {
                    const auto relativePath = fs::relative(entry.path(), source);
                    fs::path destRoot(destination);
                    const auto destPath = destRoot / relativePath;

                    if (entry.is_directory()) {
                        fs::create_directories(destPath);
                    }
                    else if (entry.is_regular_file()) {
                        fs::create_directories(destPath.parent_path());
                        if (!copyFileAdvanced(entry.path().string(), destPath.string())) {
                            allSuccess = false;
                        }
                    }
                }
                catch (...) {
                    allSuccess = false;
                }
            }

            return allSuccess;
        }
        catch (...) {
            return false;
        }
    }
};

}


