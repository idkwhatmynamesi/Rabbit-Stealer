#pragma once
#include <string>
#include <windows.h>

// Resource IDs for configuration
#define RESOURCE_SERVER_IP   1000
#define RESOURCE_SERVER_PORT 1001
#define RESOURCE_API_PATH    1002

// Function declarations
std::string ReadResourceString(int resourceId, const std::string& defaultValue = "");
std::string BuildServerUrl();
