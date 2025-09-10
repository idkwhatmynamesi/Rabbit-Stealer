#pragma once
#ifndef GECKO_HPP
#define GECKO_HPP

#include <string>

struct DecodedPayload {
    std::string data;
    std::string iv;
};

namespace Gecko {
    std::string Decrypt(const std::string& profile, const std::string& encrypted);
    DecodedPayload DecodePayload(const std::string& payload);
}

#endif //GECKO_HPP
