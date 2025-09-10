#pragma once

#ifndef OS_HPP
#define OS_HPP

#include <string>
#include <vector>

namespace OS {
    std::string ReadFile(const std::string& path);
    std::string GetAppDataFolder(const std::string& path);
    std::vector<std::string> split(const std::string& str, const std::string& delim);
    std::string getenv(const std::string& env);
}

#endif
