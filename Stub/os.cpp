#include "os.h"

#include <Windows.h>
#include <filesystem>
#include <iostream>
#include <regex>

#include "obfusheader.h"
#include "winapi_structs.h"

std::string OS::ReadFile(const std::string& path) {
    const HANDLE& hFile = HiddenCalls::CreateFileA(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (hFile == INVALID_HANDLE_VALUE) {
        return "";
    }

    const DWORD dwFileSize = HiddenCalls::GetFileSize(hFile, nullptr);
    if (dwFileSize == INVALID_FILE_SIZE) {
        return "";
    }

    const HANDLE& mapHandle = HiddenCalls::CreateFileMappingA(hFile, nullptr, PAGE_READONLY, 0, 0, nullptr);
    if (mapHandle == nullptr) {
        return "";
    }

    const void* mapAddress = HiddenCalls::MapViewOfFile(mapHandle, FILE_MAP_READ, 0, 0, 0);
    if (mapAddress == nullptr) {
        return "";
    }

    auto data = std::string(static_cast<const char*>(mapAddress), dwFileSize);

    HiddenCalls::UnmapViewOfFile(mapAddress);
    HiddenCalls::CloseHandle(mapHandle);
    HiddenCalls::CloseHandle(hFile);
    return data;
}

std::string OS::GetAppDataFolder(const std::string& path) {
    const std::regex regex(OBF(R"(.*?\AppData\(Roaming|Local)\(\w+)\.*?)"));
    std::smatch match;
    std::regex_search(path, match, regex);
    return match[1].str();
}

std::vector<std::string> OS::split(const std::string& str, const std::string& delim) {
    std::vector<std::string> tokens;
    size_t prev = 0, pos = 0;
    do {
        pos = str.find(delim, prev);
        if (pos == std::string::npos) {
            pos = str.length();
        }
        std::string token = str.substr(prev, pos - prev);
        if (!token.empty()) {
            tokens.push_back(token);
        }
        prev = pos + delim.length();
    } while (pos < str.length() && prev < str.length());
    return tokens;
}


std::string OS::getenv(const std::string& env) {
    char* buffer = nullptr;
    size_t size = 0;

    if (_dupenv_s(&buffer, &size, env.c_str()) != 0 || buffer == nullptr) {
        return "";
    }

    std::string result(buffer, size);
    result.resize(result.size() - 1);

    free(buffer);
    return result;
}
