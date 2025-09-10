#pragma once
#ifndef Models_hpp
#define Models_hpp

#include <string>

namespace Models {
    struct Chromium {
        std::wstring browserName;
        std::wstring browserVersion;
        std::wstring browserRoot;
        std::wstring browserPath;
        std::wstring profileName;
        std::wstring profileLocation;
    };

    struct Gecko {
        std::wstring browserName;
        std::wstring browserVersion;
        std::wstring profileName;
        std::wstring profileLocation;
    };
}

#endif