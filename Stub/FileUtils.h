#pragma once

#include <string>
#include <filesystem>

namespace ghostnet {

namespace fs = std::filesystem;

inline bool createDirectoryIfNotExists(const std::string& path) {
    try {
        if (!fs::exists(path)) {
            fs::create_directories(path);
            return true;
        }
        return true;
    }
    catch (...) {
        return false;
    }
}

inline std::string getAppDataPath() {
    const char* appdata = std::getenv("APPDATA");
    if (appdata == nullptr) {
        return "";
    }
    return std::string(appdata);
}

inline std::string getLocalAppDataPath() {
    const char* localAppData = std::getenv("LOCALAPPDATA");
    if (localAppData == nullptr) {
        return "";
    }
    return std::string(localAppData);
}

inline std::string getUserProfilePath() {
    const char* userProfile = std::getenv("USERPROFILE");
    if (userProfile == nullptr) {
        return "";
    }
    return std::string(userProfile);
}

}


