#pragma once
#ifndef DEDUPLICATOR_HPP
#define DEDUPLICATOR_HPP

#include <string>
#include <vector>

inline std::vector<std::string> Deduplicate(const std::vector<std::string>& vec) {
    std::vector<std::string> deduplicated;
    for (const auto& str : vec) {
        if (std::find(deduplicated.begin(), deduplicated.end(), str) == deduplicated.end())
            deduplicated.push_back(str);
    }
    return deduplicated;
}

#endif
